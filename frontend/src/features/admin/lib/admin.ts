import type { UserRole } from 'shared';
import { authClient, unwrap } from '@/lib/auth';

/** A user as the administration page shows it (Better Auth admin plugin). */
export type AdminUser = {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    emailVerified: boolean;
    banned: boolean;
    banReason: string | null;
    banExpires: Date | null;
    createdAt: Date;
};

export type UserFilter = 'all' | 'admin' | 'banned';

export type UserQuery = {
    search: string;
    filter: UserFilter;
    page: number;
    pageSize: number;
};

type ApiUser = {
    id: string | number;
    email: string;
    name?: string | null;
    role?: string | null;
    emailVerified?: boolean;
    banned?: boolean | null;
    banReason?: string | null;
    banExpires?: Date | string | null;
    createdAt: Date | string;
};

function toAdminUser(user: ApiUser): AdminUser {
    return {
        id: Number(user.id),
        email: user.email,
        name: user.name ?? '',
        role: user.role === 'admin' ? 'admin' : 'user',
        emailVerified: user.emailVerified === true,
        banned: user.banned === true,
        banReason: user.banReason ?? null,
        banExpires: user.banExpires ? new Date(user.banExpires) : null,
        createdAt: new Date(user.createdAt),
    };
}

const FILTERS = {
    all: {},
    admin: { filterField: 'role', filterValue: 'admin' },
    banned: { filterField: 'banned', filterValue: true },
} as const;

/** One page of users, newest first; `search` matches part of the email address. */
export async function listUsers({ search, filter, page, pageSize }: UserQuery) {
    const { users, total } = unwrap(
        await authClient.admin.listUsers({
            query: {
                limit: pageSize,
                offset: page * pageSize,
                sortBy: 'createdAt',
                sortDirection: 'desc',
                ...(search.trim() && {
                    searchField: 'email',
                    searchOperator: 'contains',
                    searchValue: search.trim(),
                }),
                ...FILTERS[filter],
            },
        }),
    );
    return { users: (users as ApiUser[]).map(toAdminUser), total };
}

/** How many users each filter matches, for the summary cards. */
export async function countUsers(): Promise<Record<UserFilter, number>> {
    const count = async (filter: UserFilter) =>
        unwrap(await authClient.admin.listUsers({ query: { limit: 1, ...FILTERS[filter] } })).total;
    const [all, admin, banned] = await Promise.all([count('all'), count('admin'), count('banned')]);
    return { all, admin, banned };
}

export async function setUserRole(userId: number, role: UserRole) {
    unwrap(await authClient.admin.setRole({ userId: String(userId), role }));
}

/** Bans the user and signs them out everywhere; no `expiresInDays` means until unbanned. */
export async function banUser(userId: number, reason: string, expiresInDays?: number) {
    unwrap(
        await authClient.admin.banUser({
            userId: String(userId),
            ...(reason.trim() && { banReason: reason.trim() }),
            ...(expiresInDays && { banExpiresIn: expiresInDays * 24 * 60 * 60 }),
        }),
    );
}

export async function unbanUser(userId: number) {
    unwrap(await authClient.admin.unbanUser({ userId: String(userId) }));
}

/** Signs the user out of every device. */
export async function revokeUserSessions(userId: number) {
    unwrap(await authClient.admin.revokeUserSessions({ userId: String(userId) }));
}

/** Deletes the account and everything it owns (widgets, connections, sessions). */
export async function removeUser(userId: number) {
    unwrap(await authClient.admin.removeUser({ userId: String(userId) }));
}
