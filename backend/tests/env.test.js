const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ENV_MODULE = path.join(__dirname, '..', 'utils', 'env.js');
const VALID = {
    PATH: process.env.PATH,
    DATABASE_URL: 'postgresql://user:password@localhost:5432/dashboard',
    JWT_SECRET: 'a'.repeat(32),
};

// utils/env exits the process on invalid input, so load it in a child process.
function loadEnv(overrides) {
    const result = spawnSync(
        process.execPath,
        ['-e', `process.stdout.write(JSON.stringify(require(${JSON.stringify(ENV_MODULE)})))`],
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
