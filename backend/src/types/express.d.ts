import type { AuthPayload } from '../middleware/auth.ts';

declare global {
    namespace Express {
        interface Request {
            /** Set by middleware/auth once the session is verified. */
            user?: AuthPayload;
        }
    }
}

export {};
