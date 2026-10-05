const { z } = require('zod');

// Validates the environment once at boot and exits on error. Modules may still read
// process.env at call time (tests change it per case); this schema is the single list
// of supported variables and their constraints.

// `.env` files often keep a key with an empty value: treat it as unset.
const optional = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.string().default('8080'),
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
    JWT_EXPIRES_IN: z.string().default('24h'),
    SALT_ROUNDS: z.coerce.number().int().min(1).default(10),
    GLOBAL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    // Falls back to JWT_SECRET when unset (see utils/encryption.js).
    ENCRYPTION_KEY: optional(
        z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters long'),
    ),
    CORS_ORIGINS: optional(z.string()),
    REDIS_URL: optional(z.string().url('REDIS_URL must be a valid URL')),
    FRONTEND_URL: optional(z.string().url('FRONTEND_URL must be a valid URL')),
    GITHUB_CLIENT_ID: optional(z.string()),
    GITHUB_CLIENT_SECRET: optional(z.string()),
    GITHUB_CALLBACK_URL: optional(z.string().url('GITHUB_CALLBACK_URL must be a valid URL')),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error('❌ Invalid environment variables:');
    console.error(z.prettifyError(_env.error));
    process.exit(1);
}

module.exports = _env.data;
