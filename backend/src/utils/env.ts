import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Loads backend/.env before anything reads process.env. With ES modules a file's imports run
// before its own code, so this module must be the first import of the entry points.
// Tests set their own environment and must not depend on the developer's .env.
if (process.env.NODE_ENV !== 'test') {
    dotenv.config({ path: path.join(import.meta.dirname, '..', '..', '.env'), quiet: true });
}

// Validates the environment once at boot and exits on error. Modules may still read
// process.env at call time (tests change it per case); this schema is the single list
// of supported variables and their constraints.

// `.env` files often keep a key with an empty value: treat it as unset.
const optional = <T extends z.ZodType>(schema: T) =>
    z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.string().default('8080'),
    DATABASE_URL: z
        .url('DATABASE_URL must be a valid URL')
        // .env files are read as-is: `${POSTGRES_DB}` would become part of the database name.
        .refine((url) => !url.includes('${'), 'DATABASE_URL must not reference other variables'),
    // Signs Better Auth's session cookies and encrypts the stored OAuth tokens.
    BETTER_AUTH_SECRET: z
        .string()
        .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters long'),
    // Public URL of this API (where /api/auth/* is reached): OAuth callbacks are built from it,
    // and session cookies are marked Secure when it uses https.
    BETTER_AUTH_URL: z.url('BETTER_AUTH_URL must be a valid URL').default('http://localhost:8080'),
    GLOBAL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    // Falls back to BETTER_AUTH_SECRET when unset (see utils/encryption.ts).
    ENCRYPTION_KEY: optional(
        z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters long'),
    ),
    CORS_ORIGINS: optional(z.string()),
    REDIS_URL: optional(z.url('REDIS_URL must be a valid URL')),
    GITHUB_CLIENT_ID: optional(z.string()),
    GITHUB_CLIENT_SECRET: optional(z.string()),
    // Optional second GitHub OAuth App for the GitHub service accounts (widgets); defaults to
    // the sign-in app above.
    GITHUB_SERVICE_CLIENT_ID: optional(z.string()),
    GITHUB_SERVICE_CLIENT_SECRET: optional(z.string()),
    // Outgoing email (verification and password-reset codes), any SMTP provider. Without
    // SMTP_HOST, development prints the emails in the console; production refuses to start.
    SMTP_HOST: optional(z.string()),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    // true for implicit TLS (usually port 465); otherwise STARTTLS is used when offered.
    SMTP_SECURE: z
        .enum(['true', 'false'])
        .default('false')
        .transform((v) => v === 'true'),
    SMTP_USER: optional(z.string()),
    SMTP_PASSWORD: optional(z.string()),
    // Sender; defaults to SMTP_USER (Gmail rewrites any other address to the account's).
    MAIL_FROM: optional(z.string()),
    // Creates the demo accounts (known passwords, see utils/demoData.ts) at startup when they
    // are missing. For grading and demos only: keep it off on a real deployment.
    SEED_DEMO_DATA: z
        .enum(['true', 'false'])
        .default('false')
        .transform((v) => v === 'true'),
});

const _env = envSchema
    .refine((env) => env.NODE_ENV !== 'production' || env.SMTP_HOST, {
        message: 'SMTP_HOST is required in production: users must receive their codes',
        path: ['SMTP_HOST'],
    })
    .safeParse(process.env);

if (!_env.success) {
    console.error('❌ Invalid environment variables:');
    console.error(z.prettifyError(_env.error));
    process.exit(1);
}

export default _env.data;
