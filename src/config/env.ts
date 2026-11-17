import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().regex(/^\d+$/, "PORT must be a positive integer").optional(),
  MONGODB_URI: z.string().trim().min(1).optional(),
  CLIENT_ORIGIN: z.string().trim().min(1).default("http://localhost:5173"),
  NODE_ENV: z.string().trim().min(1).default("development"),
  DEBUG: z.string().trim().default("false"),
});

const parsed = envSchema.parse({
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  NODE_ENV: process.env.NODE_ENV,
  DEBUG: process.env.DEBUG,
});

const port = parsed.PORT === undefined ? 5000 : Number(parsed.PORT);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

export const env = {
  port,
  mongodbUri: parsed.MONGODB_URI,
  clientOrigin: parsed.CLIENT_ORIGIN,
  nodeEnv: parsed.NODE_ENV,
  debug: parsed.DEBUG.toLowerCase() === "true",
};
