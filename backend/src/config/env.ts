import "dotenv/config";

const port = Number(process.env.PORT ?? 4000);

export const env = {
  port: Number.isFinite(port) ? port : 4000,
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL ?? "",
};

if (!env.databaseUrl) {
  console.warn("DATABASE_URL is not set. API database calls will fail.");
}
