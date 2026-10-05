import type { AuthPayload } from '../utils/authToken.ts';

declare global {
    namespace Express {
        interface Request {
            /** Set by middleware/auth once the session or Bearer token is verified. */
            user?: AuthPayload;
        }
    }
}

export {};
