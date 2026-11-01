interface Env {
  CACHE: KVNamespace;
  APPS_SCRIPT_URL: string;
  ALLOWED_ORIGINS: string;
}

interface GalleryPhoto {
  id: string;
  src: string;
}

interface ThumbMetadata {
  contentType: string;
}

// 640 stays allowed for site builds from before cards switched to 480.
const ALLOWED_WIDTHS = new Set(["480", "640", "1600"]);
const FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;
const PHOTO_LIST_KEY = "photos";
const PREWARM_WIDTH = "480";
// Free plan allows 50 subrequests per invocation; leave room for the Apps Script call and KV.
const PREWARM_LIMIT = 40;

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const thumbMatch = url.pathname.match(/^\/thumb\/([^/]+)$/);

      if (thumbMatch && request.method === "GET") {
        return await handleThumb(thumbMatch[1], url.searchParams.get("w") ?? "", env, ctx);
      }

      if (url.pathname === "/photos" && request.method === "GET") {
        return await handlePhotos(env, ctx, cors);
      }

      if (url.pathname === "/photos/refresh" && request.method === "POST") {
        const photos = await refreshPhotoList(env);
        ctx.waitUntil(prewarmThumbnails(photos, env));
        return json({ ok: true, data: { photos } }, cors);
      }

      return new Response("Not found", { status: 404, headers: cors });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cache worker error.";
      return json({ ok: false, error: message }, cors, 502);
    }
  },

  // Apps Script can take over a minute, longer than waitUntil allows after a response,
  // so the photo list is refreshed on a schedule instead of in the background of a request.
  async scheduled(_controller, env) {
    const photos = await refreshPhotoList(env);
    await prewarmThumbnails(photos, env);
  },
} satisfies ExportedHandler<Env>;

async function handleThumb(fileId: string, width: string, env: Env, ctx: ExecutionContext) {
  if (!FILE_ID_PATTERN.test(fileId) || !ALLOWED_WIDTHS.has(width)) {
    return new Response("Invalid thumbnail request", { status: 400 });
  }

  const key = thumbKey(width, fileId);
  // A failed read (e.g. daily KV limit reached) falls through to Drive rather than erroring.
  const cached = await env.CACHE.getWithMetadata<ThumbMetadata>(key, {
    type: "arrayBuffer",
    // Thumbnails never change, so let each edge location hold them for a day.
    cacheTtl: 86_400,
  }).catch(() => null);

  if (cached?.value) {
    return new Response(cached.value, {
      headers: imageHeaders(cached.metadata?.contentType ?? "image/jpeg", "HIT"),
    });
  }

  const upstream = await fetchDriveThumbnail(fileId, width);

  if (!upstream) {
    return new Response("Thumbnail unavailable", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const contentType = upstream.headers.get("Content-Type") ?? "image/jpeg";
  const body = await upstream.arrayBuffer();

  ctx.waitUntil(putThumb(env, key, body, contentType));

  return new Response(body, { headers: imageHeaders(contentType, "MISS") });
}

async function handlePhotos(env: Env, ctx: ExecutionContext, cors: HeadersInit) {
  const cached = await env.CACHE.get<GalleryPhoto[]>(PHOTO_LIST_KEY, "json");

  if (cached) {
    return json({ ok: true, data: { photos: cached } }, cors);
  }

  // Only happens before the first scheduled refresh has stored a list.
  const photos = await refreshPhotoList(env);
  ctx.waitUntil(prewarmThumbnails(photos, env));
  return json({ ok: true, data: { photos } }, cors);
}

async function refreshPhotoList(env: Env) {
  const response = await fetch(env.APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "listPhotos" }),
  });

  const body = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    data?: { photos?: GalleryPhoto[] };
  } | null;

  if (!response.ok || !body?.ok) {
    throw new Error(body?.error || "Apps Script request failed.");
  }

  const photos = body.data?.photos ?? [];
  const serialized = JSON.stringify(photos);

  // KV's free tier allows 1,000 writes a day, so skip the write when nothing changed.
  if ((await env.CACHE.get(PHOTO_LIST_KEY)) !== serialized) {
    await env.CACHE.put(PHOTO_LIST_KEY, serialized);
  }

  return photos;
}

async function prewarmThumbnails(photos: GalleryPhoto[], env: Env) {
  const keys = photos
    .map((photo) => getDriveFileId(photo.src))
    .filter((fileId): fileId is string => Boolean(fileId && FILE_ID_PATTERN.test(fileId)))
    .map((fileId) => ({ fileId, key: thumbKey(PREWARM_WIDTH, fileId) }));

  if (keys.length === 0) {
    return;
  }

  // One list call instead of a read per photo.
  const existing = await listKeys(env, `img/${PREWARM_WIDTH}/`);
  const missing = keys.filter(({ key }) => !existing.has(key)).slice(0, PREWARM_LIMIT);

  for (const { fileId, key } of missing) {
    const upstream = await fetchDriveThumbnail(fileId, PREWARM_WIDTH);

    if (upstream) {
      await putThumb(
        env,
        key,
        await upstream.arrayBuffer(),
        upstream.headers.get("Content-Type") ?? "image/jpeg",
      );
    }
  }
}

async function listKeys(env: Env, prefix: string) {
  const names = new Set<string>();
  let cursor: string | undefined;

  do {
    const page = await env.CACHE.list({ prefix, cursor });
    page.keys.forEach((key) => names.add(key.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return names;
}

async function putThumb(env: Env, key: string, body: ArrayBuffer, contentType: string) {
  try {
    await env.CACHE.put(key, body, { metadata: { contentType } satisfies ThumbMetadata });
  } catch {
    // Write limit reached; the image was still served, it just isn't cached yet.
  }
}

async function fetchDriveThumbnail(fileId: string, width: string) {
  const id = encodeURIComponent(fileId);

  // "-rw" asks Google for WebP, about a third the size of the JPEG thumbnail.
  return (
    (await fetchImage(`https://lh3.googleusercontent.com/d/${id}=w${width}-rw`)) ??
    (await fetchImage(`https://drive.google.com/thumbnail?id=${id}&sz=w${width}`))
  );
}

async function fetchImage(url: string) {
  const response = await fetch(url, { redirect: "follow" });

  if (!response.ok || !response.headers.get("Content-Type")?.startsWith("image/")) {
    return null;
  }

  return response;
}

// Mirrors getDriveFileId in src/lib/drive-images.ts.
function getDriveFileId(src: string) {
  try {
    const url = new URL(src);
    return url.searchParams.get("id") ?? url.pathname.match(/\/(?:file\/)?d\/([^/]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function thumbKey(width: string, fileId: string) {
  return `img/${width}/${fileId}`;
}

function imageHeaders(contentType: string, cacheStatus: "HIT" | "MISS") {
  return {
    "Content-Type": contentType,
    // Drive file ids never change content, so browsers can keep these forever.
    "Cache-Control": "public, max-age=31536000, immutable",
    "Access-Control-Allow-Origin": "*",
    "X-Cache": cacheStatus,
  };
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = env.ALLOWED_ORIGINS.split(",").map((value) => value.trim());

  if (!allowed.includes(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(payload: unknown, headers: HeadersInit, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
