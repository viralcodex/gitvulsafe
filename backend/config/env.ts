import dotenv from "dotenv";

dotenv.config();

// Load environment variables with defaults
export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  googleApiKey: process.env.GOOGLE_API_KEY ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
};

export const isProduction = config.nodeEnv === "production";

export const origin = isProduction ? process.env.PROD_ORIGIN : process.env.DEV_ORIGIN;
