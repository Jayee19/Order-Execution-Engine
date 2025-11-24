import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://user:password@localhost:5432/orderengine'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  QUEUE_CONCURRENCY: z.coerce.number().default(10),
  MAX_RETRIES: z.coerce.number().default(3),
  SOLANA_RPC_URL: z.string().default('https://api.devnet.solana.com'),
  SOLANA_COMMITMENT: z.enum(['finalized', 'confirmed', 'processed']).default('finalized'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

