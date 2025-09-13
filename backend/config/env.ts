export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  googleApiKey: process.env.GOOGLE_API_KEY ?? "",
  dbUrl: process.env.DB_URL ?? "",
  origin: process.env.ORIGIN ?? "http://localhost:3000",
};

export const isProduction = config.nodeEnv === "production";
export const isDevelopment = config.nodeEnv === "development";
