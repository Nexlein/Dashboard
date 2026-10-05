import { vi } from 'vitest';
// Runs before every unit test file: a valid environment for utils/env, in-memory replacements
// for the Redis client libraries (see __mocks__/), and a stand-in for Better Auth.
process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
process.env.BETTER_AUTH_SECRET = 'unit-test-better-auth-secret-32-characters!';
process.env.ENCRYPTION_KEY = 'supersecretencryptionkeythatis32charslong!';
process.env.PORT = '8080';
process.env.NODE_ENV = 'test';

vi.mock('redis');
vi.mock('rate-limit-redis');

// Unit tests exercise the API's own routes: who is signed in comes from signedInAs()
// (tests/helpers.ts). Better Auth itself runs for real in tests/integration/.
vi.mock('../src/auth.ts', () => ({
    auth: {
        handler: vi.fn(async () => Response.json({ code: 'NOT_IN_UNIT_TESTS' }, { status: 501 })),
        api: {
            getSession: vi.fn(async () => null),
            getAccessToken: vi.fn(),
            unlinkAccount: vi.fn(),
        },
    },
}));
