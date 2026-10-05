import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ENV_MODULE = path.join(import.meta.dirname, '..', 'utils', 'env.js');
const VALID = {
    PATH: process.env.PATH,
    DATABASE_URL: 'postgresql://user:password@localhost:5432/dashboard',
    JWT_SECRET: 'a'.repeat(32),
    // Keeps utils/env from reading the developer's backend/.env.
    NODE_ENV: 'test',
};

// utils/env exits the process on invalid input, so load it in a child process.
function loadEnv(overrides) {
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
        expect(env).toMatchObject({ PORT: '8080', SALT_ROUNDS: 10, AUTH_RATE_LIMIT_MAX: 20 });
    });

    it('treats empty optional values from .env.example as unset', () => {
        const { status, env } = loadEnv({
            ENCRYPTION_KEY: '',
            FRONTEND_URL: '',
            REDIS_URL: '',
            GITHUB_CLIENT_ID: '',
            GITHUB_CALLBACK_URL: '',
        });

        expect(status).toBe(0);
        expect(env.ENCRYPTION_KEY).toBeUndefined();
        expect(env.FRONTEND_URL).toBeUndefined();
    });

    it.each([
        ['JWT_SECRET', 'too-short'],
        ['ENCRYPTION_KEY', 'too-short'],
        ['DATABASE_URL', 'not a url'],
        ['FRONTEND_URL', 'not a url'],
    ])('exits when %s is invalid', (key, value) => {
        const { status, stderr } = loadEnv({ [key]: value });

        expect(status).toBe(1);
        expect(stderr).toContain(key);
    });
});
