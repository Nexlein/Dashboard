// Runs before every integration test file, so before the app reads its environment.
if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL must point to an isolated, disposable test database');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.BETTER_AUTH_SECRET = 'integration-better-auth-secret-at-least-32-chars';
process.env.BETTER_AUTH_URL = 'http://localhost:8080';
process.env.ENCRYPTION_KEY = 'integration-encryption-secret-that-is-at-least-32-bytes';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.GITHUB_CLIENT_ID = 'integration-client';
process.env.GITHUB_CLIENT_SECRET = 'integration-client-secret';
// Every test signs in: keep the sign-in limiter out of the way (unit tests cover it).
process.env.AUTH_RATE_LIMIT_MAX = '100000';
delete process.env.REDIS_URL;
