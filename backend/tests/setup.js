process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'api-test-secret-that-is-long-enough-for-authentication-tests';
process.env.ENCRYPTION_KEY = 'gdpr-encryption-test-secret-012';
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.GITHUB_CALLBACK_URL = 'http://localhost:8080/auth/github/callback';
process.env.REDIS_URL = '';
