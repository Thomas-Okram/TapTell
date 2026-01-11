import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),

  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),

  SUPER_ADMIN_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),

  // ✅ required for PIN login tokens
  ADMIN_TOKEN_SECRET: z.string().min(16),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  WHATSAPP_PROVIDER: z.string().optional(),

  WAPPIE_BASE_URL: z.string().optional(),
  WAPPIE_API_KEY: z.string().optional(),
  WAPPIE_AUTH_HEADER: z.string().optional(),
  WAPPIE_AUTH_PREFIX: z.string().optional(),
  WAPPIE_SEND_TEXT_PATH: z.string().optional(),
  WAPPIE_SEND_IMAGE_PATH: z.string().optional(),
  WAPPIE_FIELD_TO: z.string().optional(),
  WAPPIE_FIELD_TEXT: z.string().optional(),
  WAPPIE_FIELD_IMAGE_URL: z.string().optional(),
  WAPPIE_FIELD_CAPTION: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;
export const env: Env = EnvSchema.parse(process.env);
