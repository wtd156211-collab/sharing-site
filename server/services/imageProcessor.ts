import path from "node:path";
import sharp from "sharp";

const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByMime: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export type ProcessImageInput = {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
};

export type ProcessedImage = {
  buffer: Buffer;
  thumbnail: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  originalName: string;
  width: number;
  height: number;
};

function normalizeName(name: string, mimeType: string) {
  const basename = path.basename(name).replace(/[\u0000-\u001f\u007f]/g, "_").slice(0, 200);
  const extension = path.extname(basename).toLowerCase();
  if (!basename || extension !== extensionByMime[mimeType]) throw new ImageValidationError("File extension does not match MIME type");
  return basename;
}

export async function processImage(
  input: ProcessImageInput,
  options: { maxBytes?: number; maxDimension?: number } = {},
): Promise<ProcessedImage> {
  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  const maxDimension = options.maxDimension ?? 12_000;
  if (!allowedMime.has(input.mimeType)) throw new ImageValidationError("Unsupported image type");
  if (!Buffer.isBuffer(input.buffer) || input.buffer.length === 0 || input.buffer.length > maxBytes) throw new ImageValidationError("Image exceeds size limit");
  const originalName = normalizeName(input.originalName, input.mimeType);

  let metadata: { format?: string; width?: number; height?: number };
  try {
    metadata = await sharp(input.buffer, { failOn: "error" }).metadata();
  } catch {
    throw new ImageValidationError("Invalid image data");
  }
  const format = metadata.format === "jpg" ? "jpeg" : metadata.format;
  if (format !== input.mimeType.slice("image/".length)) throw new ImageValidationError("Image bytes do not match MIME type");
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height || width > maxDimension || height > maxDimension) throw new ImageValidationError("Image dimensions are not allowed");

  const normalized = sharp(input.buffer, { failOn: "error" }).rotate();
  const thumbSource = sharp(input.buffer, { failOn: "error" }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
  let buffer: Buffer;
  let thumbnail: Buffer;
  if (input.mimeType === "image/jpeg") {
    buffer = await normalized.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    thumbnail = await thumbSource.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } else if (input.mimeType === "image/png") {
    buffer = await normalized.png().toBuffer();
    thumbnail = await thumbSource.png({ compressionLevel: 9 }).toBuffer();
  } else {
    buffer = await normalized.webp({ quality: 90 }).toBuffer();
    thumbnail = await thumbSource.webp({ quality: 80 }).toBuffer();
  }

  return { buffer, thumbnail, mimeType: input.mimeType as ProcessedImage["mimeType"], originalName, width, height };
}
