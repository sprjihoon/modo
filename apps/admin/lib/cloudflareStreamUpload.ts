import { supabaseAdmin } from "@/lib/supabase";

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_STREAM_TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

const DEFAULT_SIGN_TIMEOUT_MS = 15_000;
const DEFAULT_UPLOAD_TIMEOUT_MS = 60_000;

// 영상 자동 삭제 기간 (일)
const VIDEO_RETENTION_DAYS = 60;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(message), ms);
	return promise.finally(() => clearTimeout(timeout));
}

/**
 * Upload Blob to Cloudflare Stream via Direct Upload and record to Supabase media.
 *
 * - Requests a direct upload URL from Cloudflare Stream API.
 * - Uploads the Blob using multipart/form-data to the returned uploadURL.
 * - Inserts a row into media table: { final_waybill_no, type, provider: 'cloudflare', path: videoId }.
 * - Returns the videoId (Cloudflare Stream UID).
 *
 * Note: Must run on the server (env secrets required).
 */
export async function uploadToCloudflareStream(
	blob: Blob,
	finalWaybillNo: string,
	type: string,
	sequence: number = 1,
	durationSeconds?: number
): Promise<string> {
	if (!CF_ACCOUNT_ID || !CF_STREAM_TOKEN) {
		throw new Error("Cloudflare Stream credentials are not configured (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_TOKEN).");
	}
	if (!blob || blob.size === 0) {
		throw new Error("Invalid Blob: empty content.");
	}
	if (!finalWaybillNo) {
		throw new Error("finalWaybillNo is required.");
	}
	if (!type) {
		throw new Error("type is required.");
	}

	// 1) Create a direct upload URL with scheduled deletion
	const signUrl = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
		CF_ACCOUNT_ID
	)}/stream/direct_upload`;

	// 만료일 계산 (현재 시각 + 60일)
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + VIDEO_RETENTION_DAYS);
	const scheduledDeletion = expiresAt.toISOString();

	const signReq = fetch(signUrl, {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${CF_STREAM_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			maxDurationSeconds: 10 * 60, // 10 minutes limit as a safeguard
			scheduledDeletion, // 60일 후 Cloudflare에서 자동 삭제
			meta: {
				waybillNo: finalWaybillNo,
				type,
				uploadedAt: new Date().toISOString(),
			},
		}),
	});

	const signRes = await withTimeout(signReq, DEFAULT_SIGN_TIMEOUT_MS, "Cloudflare sign request timed out");
	if (!signRes.ok) {
		const text = await signRes.text().catch(() => "");
		throw new Error(`Cloudflare sign failed: ${signRes.status} ${text}`);
	}
	const signJson: any = await signRes.json();
	const uploadURL: string | undefined = signJson?.result?.uploadURL;
	const videoIdFromSign: string | undefined = signJson?.result?.id || signJson?.result?.uid;
	if (!uploadURL || !videoIdFromSign) {
		throw new Error("Cloudflare sign response missing uploadURL or id.");
	}

	// 2) Upload the Blob to the uploadURL via multipart/form-data
	const form = new FormData();
	const filename = `${finalWaybillNo || "video"}.webm`;
	form.append("file", blob, filename);

	const uploadReq = fetch(uploadURL, {
		method: "POST",
		body: form,
	});
	const uploadRes = await withTimeout(uploadReq, DEFAULT_UPLOAD_TIMEOUT_MS, "Cloudflare upload timed out");
	if (!uploadRes.ok) {
		const text = await uploadRes.text().catch(() => "");
		throw new Error(`Cloudflare upload failed: ${uploadRes.status} ${text}`);
	}

	// 3) Persist to Supabase 'media' table
	try {
		const { error } = await supabaseAdmin
			.from("media")
			.insert({
				final_waybill_no: finalWaybillNo,
				type,
				provider: "cloudflare",
				path: videoIdFromSign,
				sequence,
				duration_seconds: durationSeconds,
				expires_at: scheduledDeletion, // 만료일 저장
			});
		if (error) {
			// Do not fail the whole flow; log via thrown error for visibility
			// but caller can decide to ignore if needed.
			throw new Error(error.message);
		}
		console.log(`✅ 영상 저장 완료 (만료: ${VIDEO_RETENTION_DAYS}일 후)`);
	} catch (e) {
		// Minimal error handling as requested
		console.error("Supabase media insert failed:", e);
	}

	return videoIdFromSign;
}


