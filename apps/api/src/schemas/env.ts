import { z } from 'zod';

const MAX_PORT = 65_535;
const DEFAULT_PORT = 3000;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 5000;

export const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  HOST: z.string().min(1).default('0.0.0.0'),
  WIKIPEDIA_BASE_URL: z.url().default('https://en.wikipedia.org'),
  USER_AGENT: z
    .string()
    .trim()
    .min(1, 'USER_AGENT must not be blank')
    .default('BearApp/0.1 (Web Engineering course playground)'),
  UPSTREAM_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_UPSTREAM_TIMEOUT_MS),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:4173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin !== '')
    ),
  APP_VERSION: z.string().min(1).optional(),
  ENABLE_DEBUG_ROUTES: z.stringbool().default(false),
  LOG_FORMAT: z.enum(['pretty', 'json']).default('pretty'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${z.prettifyError(result.error)}`
    );
  }
  return result.data;
}
