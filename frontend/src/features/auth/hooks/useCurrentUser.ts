import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/lib/auth';

export const CURRENT_USER_KEY = ['currentUser'] as const;

/**
 * The signed-in user. The session lives in an httpOnly cookie that scripts cannot read, so
 * GET /auth/me is the only way to know whether the visitor is signed in: an error means no
 * valid session.
 */
export function useCurrentUser() {
    return useQuery({ queryKey: CURRENT_USER_KEY, queryFn: getCurrentUser, retry: false });
}
