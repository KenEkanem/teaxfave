import { describe, expect, it } from "vitest";
import { getDriveFileId, getDriveThumbnailUrl } from "@/lib/drive-images";

describe("Drive image URLs", () => {
  it("reads file ids from query URLs", () => {
    expect(getDriveFileId("https://drive.google.com/uc?export=view&id=file123")).toBe("file123");
  });

  it("reads file ids from shared file URLs", () => {
    expect(getDriveFileId("https://drive.google.com/file/d/file456/view")).toBe("file456");
  });

  it("uses a sized thumbnail for Drive images", () => {
    expect(getDriveThumbnailUrl("https://drive.google.com/file/d/file456/view", 640)).toBe(
      "https://drive.google.com/thumbnail?id=file456&sz=w640",
    );
  });

  it("leaves non Drive image URLs unchanged", () => {
    const src = "https://example.com/photo.jpg";
    expect(getDriveThumbnailUrl(src, 640)).toBe(src);
  });
});
