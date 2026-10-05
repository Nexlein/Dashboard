import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ENV_MODULE = path.join(import.meta.dirname, '..', 'src', 'utils', 'env.ts');
const VALID = {
    PATH: process.env.PATH,
    DATABASE_URL: 'postgresql://user:password@localhost:5432/dashboard',
    BETTER_AUTH_SECRET: 'a'.repeat(32),
    // Keeps utils/env from reading the developer's backend/.env.
    NODE_ENV: 'test',
};

// utils/env exits the process on invalid input, so load it in a child process.
function loadEnv(overrides: Record<string, string | undefined>) {
    const result = spawnSync(
        process.execPath,
        [
            '-e',
            `import(${JSON.stringify(pathToFileURL(ENV_MODULE).href)})` +
                '.then((m) => process.stdout.write(JSON.stringify(m.default)))',
        ],
        { env: { ...VALID, ...overrides }, encoding: 'utf8' },
    );
    return {
        status: result.status,
        env: result.status === 0 ? JSON.parse(result.stdout) : null,
        stderr: result.stderr,
    };
}

describe('environment validation', () => {
    it('applies defaults to a minimal valid environment', () => {
        const { status, env } = loadEnv({});

        expect(status).toBe(0);
        expect(env).toMatchObject({
            PORT: '8080',
            AUTH_RATE_LIMIT_MAX: 20,
            BETTER_AUTH_URL: 'http://localhost:8080',
        });
    });

    it('treats empty optional values from .env.example as unset', () => {
        const { status, env } = loadEnv({
            ENCRYPTION_KEY: '',
            REDIS_URL: '',
            CORS_ORIGINS: '',
            GITHUB_CLIENT_ID: '',
            GITHUB_CLIENT_SECRET: '',
        });

        expect(status).toBe(0);
        expect(env.ENCRYPTION_KEY).toBeUndefined();
        expect(env.REDIS_URL).toBeUndefined();
    });

    it('requires SMTP in production, where users must receive their codes', () => {
        const without = loadEnv({ NODE_ENV: 'production' });
        expect(without.status).toBe(1);
        expect(without.stderr).toContain('SMTP_HOST');

        const withSmtp = loadEnv({ NODE_ENV: 'production', SMTP_HOST: 'smtp.example.com' });
        expect(withSmtp.status).toBe(0);
        expect(withSmtp.env).toMatchObject({ SMTP_PORT: 587, SMTP_SECURE: false });
    });

    it.each([
        ['BETTER_AUTH_SECRET', 'too-short'],
        ['ENCRYPTION_KEY', 'too-short'],
        ['DATABASE_URL', 'not a url'],
        // Not expanded by dotenv: the database name would be `${POSTGRES_DB}`.
        ['DATABASE_URL', 'postgresql://user:password@localhost:5432/${POSTGRES_DB}'],
        ['BETTER_AUTH_URL', 'not a url'],
    ])('exits when %s is invalid', (key, value) => {
        const { status, stderr } = loadEnv({ [key]: value });

        expect(status).toBe(1);
        expect(stderr).toContain(key);
    });
});
