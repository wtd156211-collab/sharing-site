export const ENV = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  storageDriver: process.env.STORAGE_DRIVER ?? "local",
  uploadDir: process.env.UPLOAD_DIR ?? "./data/uploads",
  maxUploadMb: Number.parseInt(process.env.MAX_UPLOAD_MB ?? "10", 10),
};

export function assertProductionEnv() {
  if (ENV.nodeEnv !== "production") return;

  const required = ["DATABASE_URL", "JWT_SECRET", "APP_BASE_URL"] as const;
  const missing = required.filter(name => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }
}
