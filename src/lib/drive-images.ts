export function getDriveFileId(src: string) {
  try {
    const url = new URL(src);
    const queryId = url.searchParams.get("id");

    if (queryId) {
      return queryId;
    }

    return url.pathname.match(/\/(?:file\/)?d\/([^/]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

export function getDriveThumbnailUrl(src: string, width: number) {
  const fileId = getDriveFileId(src);

  if (!fileId) {
    return src;
  }

  const cacheUrl = import.meta.env.VITE_IMAGE_CACHE_URL?.replace(/\/+$/, "");

  if (cacheUrl) {
    return `${cacheUrl}/thumb/${encodeURIComponent(fileId)}?w=${width}`;
  }

  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;
}
