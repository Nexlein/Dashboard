import { vi } from 'vitest';
import { auth } from '../src/auth.ts';

/** An origin allowed by CORS_ORIGINS' default: state-changing requests must send it. */
export const FRONTEND = 'http://localhost:5173';

/** Replaces global fetch with a plain stub; vitest.config.ts restores it after each test. */
export function stubFetch() {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

/** Makes the (mocked) Better Auth session belong to this user for the next requests. */
export function signedInAs(userId: number) {
    vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: String(userId) },
        session: { userId: String(userId) },
    } as never);
}
