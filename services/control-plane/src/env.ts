import { z } from 'zod';

const envSchema = z.object({
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  GOOGLE_CLOUD_REGION: z.string().default('europe-central2'),
  GOOGLE_PLAY_PACKAGE_NAME: z.string().default('com.djpokis.sparkhabits.app'),
  SPARK_PREMIUM_PRODUCT_ID: z.string().default('spark_premium_lifetime'),
  ADMIN_EMAIL_ALLOWLIST: z.string().default(''),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  INTERNAL_OIDC_AUDIENCE: z.string().default(''),
  INTERNAL_SERVICE_ACCOUNT: z.string().default(''),
  SUPPORT_RETENTION_DAYS: z.coerce.number().int().min(30).max(3650).default(90),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().min(30).max(3650).default(365),
  PORT: z.coerce.number().int().positive().default(8080),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
});

export type Environment = z.infer<typeof envSchema>;

export function readEnvironment(source = process.env): Environment {
  return envSchema.parse(source);
}

export function commaList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
