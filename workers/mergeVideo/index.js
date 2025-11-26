// Cloudflare Worker (modules syntax)
// Purpose: Merge inbound/outbound videos side-by-side using ffmpeg.wasm and upload to R2.
//
// Expected ENV bindings (configure in wrangler.toml or dashboard):
// - MERGED_BUCKET: R2 bucket binding for merged outputs
// - FFMPEG_CORE_URL: (optional) URL to ffmpeg-core.js (served from KV/Pages/R2/asset)
// - FFMPEG_WASM_URL: (optional) URL to ffmpeg-core.wasm
// - FFMPEG_WORKER_URL: (optional) URL to ffmpeg-core.worker.js
//
// Endpoint:
// POST /merge
// Body: { finalWaybillNo: string, inboundVideoUrl: string, outboundVideoUrl: string }
// Response: { mergedPath: string }
//
// Note:
// - This is a deployable skeleton. Ensure proper URLs for ffmpeg core files or bundle via tooling.
// - Logo/subtitles/intro are intentionally excluded at this stage.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/merge') {
      try {
        const payload = await request.json();
        const { finalWaybillNo, inboundVideoUrl, outboundVideoUrl } = payload || {};
        if (!finalWaybillNo || !inboundVideoUrl || !outboundVideoUrl) {
          return json({ error: 'finalWaybillNo, inboundVideoUrl, outboundVideoUrl are required' }, 400);
        }

        const mergedPath = await mergeVideos(env, finalWaybillNo, inboundVideoUrl, outboundVideoUrl);
        return json({ mergedPath });
      } catch (e) {
        return json({ error: e?.message || 'merge failed' }, 500);
      }
    }

    return json({ ok: true, message: 'merge worker ready' });
  }
};

/**
 * Merge two videos side-by-side (hstack) to MP4 and upload to R2.
 * @param {Env} env
 * @param {string} finalWaybillNo
 * @param {string} inboundVideoUrl
 * @param {string} outboundVideoUrl
 * @returns {Promise<string>} mergedPath
 */
async function mergeVideos(env, finalWaybillNo, inboundVideoUrl, outboundVideoUrl) {
  // 1) Load ffmpeg.wasm
  const ffmpeg = await loadFfmpeg(env);

  // 2) Download source videos
  const [inboundBuf, outboundBuf] = await Promise.all([
    timedFetchArrayBuffer(inboundVideoUrl, 60_000),
    timedFetchArrayBuffer(outboundVideoUrl, 60_000),
  ]);

  // 3) Write inputs into FFmpeg FS
  const inName = 'inbound.mp4';
  const outName = 'outbound.mp4';
  const mergedName = 'merged.mp4';

  // Note: @ffmpeg/ffmpeg expects Uint8Array
  ffmpeg.writeFile(inName, new Uint8Array(inboundBuf));
  ffmpeg.writeFile(outName, new Uint8Array(outboundBuf));

  // 4) Execute hstack filter (left-right split)
  // Output mp4 (H.264), faststart for streaming
  await ffmpeg.exec([
    '-i', inName,
    '-i', outName,
    '-filter_complex', 'hstack=inputs=2',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-movflags', '+faststart',
    '-f', 'mp4',
    mergedName,
  ]);

  // 5) Read merged binary
  const mergedData = await ffmpeg.readFile(mergedName);
  const mergedBytes = toArrayBuffer(mergedData);

  // 6) Upload to R2
  const timestamp = Date.now();
  const key = `merged/${encodeURIComponent(finalWaybillNo)}/merged_${timestamp}.mp4`;
  await env.MERGED_BUCKET.put(key, mergedBytes, {
    httpMetadata: {
      contentType: 'video/mp4'
    }
  });

  // 7) Return merged path (R2 object key)
  return key;
}

/**
 * Load ffmpeg.wasm in Workers.
 * This skeleton assumes @ffmpeg/ffmpeg API usage available after bundling.
 * Provide core/wasm/worker URLs via ENV if not bundled.
 */
async function loadFfmpeg(env) {
  // Defer import to runtime to allow external bundlers/tooling.
  // You will need to bundle '@ffmpeg/ffmpeg' and '@ffmpeg/util' with wrangler.
  const [{ FFmpeg }, { toBlob }] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util'),
  ]);

  const ffmpeg = new FFmpeg();

  // If you deploy core files as static assets, set ENV URLs accordingly.
  // Otherwise, omit the config and let the bundler inline assets.
  const config = {};
  if (env.FFMPEG_CORE_URL) {
    config.coreURL = env.FFMPEG_CORE_URL;
  }
  if (env.FFMPEG_WASM_URL) {
    config.wasmURL = env.FFMPEG_WASM_URL;
  }
  if (env.FFMPEG_WORKER_URL) {
    config.workerURL = env.FFMPEG_WORKER_URL;
  }

  await ffmpeg.load(config);
  return ffmpeg;
}

async function timedFetchArrayBuffer(url, timeoutMs) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort('fetch timeout'), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      throw new Error(`fetch failed: ${res.status}`);
    }
    return await res.arrayBuffer();
  } finally {
    clearTimeout(timeout);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function toArrayBuffer(data) {
  // data can be Uint8Array or Blob (depending on ffmpeg version)
  if (data instanceof Uint8Array) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  // Fallback for Blob-like objects
  if (typeof data.arrayBuffer === 'function') {
    return data.arrayBuffer();
  }
  throw new Error('Unsupported ffmpeg output type');
}


