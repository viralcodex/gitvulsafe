import rateLimit from "express-rate-limit";

export const generalRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 20 * 60 * 1000, // 20 minutes
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests, please try again later in 20 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const analysisRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000, // 10 minutes
  max: Number(process.env.ANALYSIS_RATE_LIMIT_MAX) || 20, // limit each IP to 20 requests per windowMs
  message: {
    error: "Too many requests, please try again later in 10 minutes.",
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000, // 10 minutes
  max: Number(process.env.AI_RATE_LIMIT_MAX) || 20, // limit each IP to 20 requests per windowMs
  message: {
    error: "Too many requests, please try again late in 10 minutes.",
  },
});

export const fixPlanRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000, // 20 minutes
  max: Number(process.env.FIX_PLAN_RATE_LIMIT_MAX) || 5, // limit each IP to 5 requests per windowMs
  message: {
    error: "Too many requests, please try again later in 10 minutes.",
  },
});

export const inlineAiRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000, // 1 minute
  max: Number(process.env.AI_RATE_LIMIT_MAX) || 10, // limit each IP to 10 requests per windowMs
  message: {
    error: "Too many requests, please try again later in 1 minutes.",
  },
});
