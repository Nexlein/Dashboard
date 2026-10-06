import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { countUsers, listUsers, type UserQuery } from '../lib/admin';

const ADMIN_USERS_KEY = ['admin', 'users'] as const;

export function useAdminUsers(query: UserQuery) {
    return useQuery({
        queryKey: [...ADMIN_USERS_KEY, 'list', query],
        queryFn: () => listUsers(query),
        // Keep the current page on screen while the next one loads.
        placeholderData: keepPreviousData,
    });
}

export function useUserCounts() {
    return useQuery({ queryKey: [...ADMIN_USERS_KEY, 'counts'], queryFn: countUsers });
}

/** A user action (ban, role…); the lists and counts reload once it succeeds. */
export function useAdminAction<T>(action: (input: T) => Promise<void>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: action,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
    });
}
