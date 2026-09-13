import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { ImageValidationError, processImage } from "./imageProcessor";

describe("image processor", () => {
  it("normalizes an allowed image, strips metadata and creates a thumbnail", async () => {
    const input = await sharp({ create: { width: 80, height: 40, channels: 3, background: "#e9a" } }).jpeg().toBuffer();
    const result = await processImage({ buffer: input, mimeType: "image/jpeg", originalName: "family.jpg" });
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.width).toBe(80);
    expect(result.height).toBe(40);
    expect(result.thumbnail.length).toBeLessThan(result.buffer.length);
    expect(result.originalName).toBe("family.jpg");
  });

  it("rejects mismatched MIME, extension and oversized uploads", async () => {
    const input = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).png().toBuffer();
    await expect(processImage({ buffer: input, mimeType: "image/jpeg", originalName: "family.jpg" })).rejects.toBeInstanceOf(ImageValidationError);
    await expect(processImage({ buffer: input, mimeType: "image/png", originalName: "family.txt" })).rejects.toBeInstanceOf(ImageValidationError);
    await expect(processImage({ buffer: Buffer.alloc(101), mimeType: "image/png", originalName: "family.png" }, { maxBytes: 100 })).rejects.toBeInstanceOf(ImageValidationError);
  });
});
