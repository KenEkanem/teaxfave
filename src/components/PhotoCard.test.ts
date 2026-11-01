import { afterEach, describe, expect, it, vi } from "vitest";
import { getDriveFileId, getDriveThumbnailUrl } from "@/lib/drive-images";

describe("Drive image URLs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads file ids from query URLs", () => {
    expect(getDriveFileId("https://drive.google.com/uc?export=view&id=file123")).toBe("file123");
  });

  it("reads file ids from shared file URLs", () => {
    expect(getDriveFileId("https://drive.google.com/file/d/file456/view")).toBe("file456");
  });

  it("uses a sized thumbnail for Drive images", () => {
    vi.stubEnv("VITE_IMAGE_CACHE_URL", "");
    expect(getDriveThumbnailUrl("https://drive.google.com/file/d/file456/view", 640)).toBe(
      "https://drive.google.com/thumbnail?id=file456&sz=w640",
    );
  });

  it("leaves non Drive image URLs unchanged", () => {
    const src = "https://example.com/photo.jpg";
    expect(getDriveThumbnailUrl(src, 640)).toBe(src);
  });

  it("routes Drive thumbnails through the cache worker when configured", () => {
    vi.stubEnv("VITE_IMAGE_CACHE_URL", "https://cache.example.workers.dev/");
    expect(getDriveThumbnailUrl("https://drive.google.com/file/d/file456/view", 1600)).toBe(
      "https://cache.example.workers.dev/thumb/file456?w=1600",
    );
  });

  it("leaves non Drive image URLs unchanged when the cache worker is configured", () => {
    vi.stubEnv("VITE_IMAGE_CACHE_URL", "https://cache.example.workers.dev");
    const src = "https://example.com/photo.jpg";
    expect(getDriveThumbnailUrl(src, 640)).toBe(src);
  });
});
