import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageAdapter } from "./types";

export type S3StorageConfig = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  signedUrlTtlSeconds?: number;
};

export function createS3Storage(config: S3StorageConfig): StorageAdapter {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: Boolean(config.endpoint),
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  const ttl = config.signedUrlTtlSeconds ?? 300;

  return {
    async put(key, data, contentType = "application/octet-stream") {
      await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: data, ContentType: contentType }));
      return { key, url: await getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn: ttl }) };
    },
    async getSignedUrl(key) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn: ttl });
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },
  };
}
