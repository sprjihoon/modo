import { supabaseAdmin } from "@/lib/supabase";
import * as tus from "tus-js-client";

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_STREAM_TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

// 영상 자동 삭제 기간 (일)
const VIDEO_RETENTION_DAYS = 60;

export interface UploadProgress {
	bytesUploaded: number;
	bytesTotal: number;
	percentage: number;
}

export interface TusUploadOptions {
	file: File;
	finalWaybillNo: string;
	type: string;
	sequence?: number;
	durationSeconds?: number;
	onProgress?: (progress: UploadProgress) => void;
	onError?: (error: Error) => void;
}

/**
 * Upload File to Cloudflare Stream via TUS Protocol (Resumable Upload)
 *
 * Benefits over Direct Upload:
 * - Resumable: Automatically resumes interrupted uploads
 * - Progress tracking: Real-time upload progress
 * - Chunked: Memory efficient (5MB chunks)
 * - Auto-retry: Handles network failures gracefully
 * - Better UX: Users can pause/resume uploads
 *
 * @param options Upload options including file, metadata, and callbacks
 * @returns Promise<string> - Cloudflare Stream video ID
 */
export async function uploadToCloudflareStreamTus(
	options: TusUploadOptions
): Promise<string> {
	const { file, finalWaybillNo, type, sequence = 1, durationSeconds, onProgress, onError } = options;

	if (!CF_ACCOUNT_ID || !CF_STREAM_TOKEN) {
		throw new Error("Cloudflare Stream credentials are not configured (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_TOKEN).");
	}

	if (!file || file.size === 0) {
		throw new Error("Invalid File: empty content.");
	}

	if (!finalWaybillNo) {
		throw new Error("finalWaybillNo is required.");
	}

	if (!type) {
		throw new Error("type is required.");
	}

	const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
		CF_ACCOUNT_ID
	)}/stream`;

	// 만료일 계산 (현재 시각 + 60일)
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + VIDEO_RETENTION_DAYS);
	const scheduledDeletion = expiresAt.toISOString();

	return new Promise((resolve, reject) => {
		const upload = new tus.Upload(file, {
			// TUS endpoint
			endpoint: uploadUrl,

			// Retry strategy: 0s, 3s, 5s, 10s, 20s delays
			retryDelays: [0, 3000, 5000, 10000, 20000],

			// Metadata (Cloudflare Stream TUS)
			metadata: {
				name: `${finalWaybillNo}.mp4`,
				filetype: file.type || "video/mp4",
				// Cloudflare Stream specific metadata
				requiresignedurls: "false",
				allowedorigins: "*",
				// Optional: Set thumbnail timestamp (50% into video)
				defaulttimestamppct: "0.5",
				// 60일 후 자동 삭제
				scheduledDeletion: scheduledDeletion,
				// 추가 메타데이터
				waybillNo: finalWaybillNo,
				videoType: type,
			},

			// Authorization
			headers: {
				Authorization: `Bearer ${CF_STREAM_TOKEN}`,
			},

			// Upload in 5MB chunks (memory efficient)
			chunkSize: 5 * 1024 * 1024,

			// Store upload URL in localStorage for resuming
			// (Only works in browser, disabled for server-side)
			storeFingerprintForResuming: false,

			// Remove fingerprint on success
			removeFingerprintOnSuccess: true,

			// Callbacks
			onError: (error) => {
				console.error("❌ TUS upload failed:", error);
				onError?.(error);
				reject(error);
			},

			onProgress: (bytesUploaded, bytesTotal) => {
				const percentage = ((bytesUploaded / bytesTotal) * 100);
				console.log(`📤 Upload progress: ${percentage.toFixed(1)}% (${bytesUploaded}/${bytesTotal} bytes)`);

				onProgress?.({
					bytesUploaded,
					bytesTotal,
					percentage,
				});
			},

			onSuccess: async () => {
				console.log("✅ Upload completed successfully!");

				// Extract video ID from upload URL
				// Format: https://api.cloudflare.com/client/v4/accounts/{account_id}/stream/{video_id}
				const videoId = upload.url?.split("/").pop();

				if (!videoId) {
					const error = new Error("Failed to extract video ID from upload URL");
					console.error("❌", error);
					reject(error);
					return;
				}

				console.log(`🎬 Video ID: ${videoId}`);

				// Persist to Supabase 'media' table
				try {
					const { error } = await supabaseAdmin.from("media").insert({
						final_waybill_no: finalWaybillNo,
						type,
						provider: "cloudflare",
						path: videoId,
						sequence,
						duration_seconds: durationSeconds,
						expires_at: scheduledDeletion, // 만료일 저장
					});

					if (error) {
						console.error("⚠️ Supabase media insert failed:", error);
						// Don't fail the upload, just log the error
					} else {
						console.log(`✅ Media metadata saved to Supabase (만료: ${VIDEO_RETENTION_DAYS}일 후)`);
					}
				} catch (e) {
					console.error("⚠️ Supabase media insert exception:", e);
					// Don't fail the upload
				}

				resolve(videoId);
			},

			onAfterResponse: (req, res) => {
				// Log response for debugging
				if (res.getStatus() >= 400) {
					console.error(`❌ Upload error response: ${res.getStatus()}`);
				}
			},
		});

		// Start upload
		console.log(`🚀 Starting TUS upload for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
		upload.start();

		// Optionally, you can pause/resume/abort the upload
		// upload.pause();
		// upload.resume();
		// upload.abort();
	});
}

/**
 * Get upload speed in human-readable format
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
	if (bytesPerSecond < 1024) {
		return `${bytesPerSecond.toFixed(0)} B/s`;
	} else if (bytesPerSecond < 1024 * 1024) {
		return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
	} else {
		return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
	}
}

/**
 * Calculate remaining time
 */
export function calculateRemainingTime(bytesUploaded: number, bytesTotal: number, bytesPerSecond: number): number {
	const remainingBytes = bytesTotal - bytesUploaded;
	return Math.ceil(remainingBytes / bytesPerSecond);
}

/**
 * Format time in human-readable format
 */
export function formatTime(seconds: number): string {
	if (seconds < 60) {
		return `${seconds}초`;
	} else if (seconds < 3600) {
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${minutes}분 ${secs}초`;
	} else {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		return `${hours}시간 ${minutes}분`;
	}
}

