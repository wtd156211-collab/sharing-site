export type StoragePutResult = { key: string; url: string };

export type StorageAdapter = {
  put(key: string, data: Buffer | Uint8Array | string, contentType?: string): Promise<StoragePutResult>;
  getSignedUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
};
