import { getErrorMessage } from '@/i18n/errors';
import i18n from '@/i18n';
import { formatDate, formatNumber } from '@/i18n/format';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, ShieldCheck, Ban, Users } from 'lucide-react';
import type { User } from 'shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BanUserDialog } from '@/features/admin/components/BanUserDialog';
import { UserActions, type UserAction } from '@/features/admin/components/UserActions';
import { useAdminAction, useAdminUsers, useUserCounts } from '@/features/admin/hooks/useAdminUsers';
import {
    banUser,
    removeUser,
    revokeUserSessions,
    setUserRole,
    unbanUser,
    type AdminUser,
    type UserFilter,
} from '@/features/admin/lib/admin';

const PAGE_SIZE = 20;

const FILTERS: { value: UserFilter; label: string; icon: typeof Users }[] = [
    {
        value: 'all',
        get label() {
            return i18n.t('admin:users');
        },
        icon: Users,
    },
    {
        value: 'admin',
        get label() {
            return i18n.t('admin:admins');
        },
        icon: ShieldCheck,
    },
    {
        value: 'banned',
        get label() {
            return i18n.t('admin:bannedUsers');
        },
        icon: Ban,
    },
];

const dateFormat = { format: (date: Date) => formatDate(date, { dateStyle: 'medium' }) };

/** The confirmation asked before an action, or null when it needs none. */
function confirmation(action: UserAction, label: string): string | null {
    switch (action) {
        case 'promote':
            return i18n.t('admin:promoteConfirm', { name: label });
        case 'demote':
            return i18n.t('admin:demoteConfirm', { name: label });
        case 'signOut':
            return i18n.t('admin:signOutConfirm', { name: label });
        case 'remove':
            return i18n.t('admin:removeConfirm', { name: label });
        default:
            return null;
    }
}

function StatusBadges({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
    const { t } = useTranslation('admin');
    const badge = 'rounded-full px-2 py-0.5 text-xs font-medium';
    return (
        <div className="flex flex-wrap gap-1">
            {isSelf && <span className={`${badge} bg-primary/10 text-primary`}>{t('you')}</span>}
            {user.role === 'admin' && (
                <span className={`${badge} bg-sky-500/10 text-sky-600 dark:text-sky-400`}>
                    {t('admin')}
                </span>
            )}
            {user.banned && (
                <span
                    className={`${badge} bg-destructive/10 text-destructive`}
                    title={user.banReason ?? undefined}
                >
                    {user.banExpires
                        ? t('bannedUntil', { date: dateFormat.format(user.banExpires) })
                        : t('banned')}
                </span>
            )}
            {!user.emailVerified && (
                <span className={`${badge} bg-muted text-muted-foreground`}>
                    {t('emailUnverified')}
                </span>
            )}
        </div>
    );
}

/** Administration: every account, with role, ban, sign-out and deletion actions. */
export default function AdminPage({ currentUser }: { currentUser: User }) {
    const { t } = useTranslation(['common', 'admin']);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<UserFilter>('all');
    const [page, setPage] = useState(0);
    const [banning, setBanning] = useState<AdminUser | null>(null);
    const [error, setError] = useState<unknown>('');

    // Search once typing pauses, from the first page.
    useEffect(() => {
        if (searchInput === search) return;
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPage(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, search]);

    const users = useAdminUsers({ search, filter, page, pageSize: PAGE_SIZE });
    const counts = useUserCounts();
    const action = useAdminAction(
        async ({ user, type }: { user: AdminUser; type: Exclude<UserAction, 'ban'> }) => {
            if (type === 'promote') await setUserRole(user.id, 'admin');
            if (type === 'demote') await setUserRole(user.id, 'user');
            if (type === 'unban') await unbanUser(user.id);
            if (type === 'signOut') await revokeUserSessions(user.id);
            if (type === 'remove') await removeUser(user.id);
        },
    );
    const ban = useAdminAction(
        ({ user, reason, days }: { user: AdminUser; reason: string; days?: number }) =>
            banUser(user.id, reason, days),
    );

    function handleAction(user: AdminUser, type: UserAction) {
        setError('');
        if (type === 'ban') return setBanning(user);
        const question = confirmation(type, user.name || user.email);
        if (question && !window.confirm(question)) return;
        action.mutate({ user, type }, { onError: (err) => setError(err) });
    }

    const total = users.data?.total ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    // A deletion or a filter change can leave the current page past the end: go back to the
    // last page once the real total is known (not the previous page's placeholder data).
    if (users.data && !users.isPlaceholderData && page >= pageCount) setPage(pageCount - 1);

    return (
        <main className="mx-auto w-full max-w-6xl p-4 sm:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-semibold tracking-tight">
                    {t('common:administration')}
                </h1>
                <p className="mt-2 text-muted-foreground">{t('admin:subtitle')}</p>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
                {FILTERS.map(({ value, label, icon: Icon }) => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={filter === value}
                        onClick={() => {
                            setFilter(value);
                            setPage(0);
                        }}
                        className={`flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/60 sm:p-4 ${
                            filter === value ? 'border-primary ring-1 ring-primary' : ''
                        }`}
                    >
                        <span className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-muted sm:flex">
                            <Icon className="size-5 text-muted-foreground" />
                        </span>
                        <span>
                            <span className="block text-2xl font-semibold tabular-nums">
                                {counts.data ? formatNumber(counts.data[value]) : '–'}
                            </span>
                            <span className="text-xs text-muted-foreground sm:text-sm">
                                {label}
                            </span>
                        </span>
                    </button>
                ))}
            </div>

            <div className="relative mb-4 max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="search"
                    aria-label={t('admin:searchLabel')}
                    placeholder={t('admin:searchPlaceholder')}
                    className="pl-9"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                />
            </div>

            {(Boolean(error) || users.isError) && (
                <div
                    role="alert"
                    className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {getErrorMessage(error || users.error)}
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                        <tr>
                            <th scope="col" className="px-4 py-3 font-medium">
                                {t('admin:user')}
                            </th>
                            <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
                                {t('admin:status')}
                            </th>
                            <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                                {t('admin:registration')}
                            </th>
                            <th scope="col" className="px-4 py-3">
                                <span className="sr-only">{t('admin:actions')}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.data?.users.map((user) => {
                            const isSelf = user.id === currentUser.id;
                            return (
                                <tr key={user.id} className="border-b last:border-0">
                                    <td className="max-w-0 px-4 py-3">
                                        <p className="truncate font-medium">{user.name || '—'}</p>
                                        <p className="truncate text-muted-foreground">
                                            {user.email}
                                        </p>
                                        {/* Small screens show the status under the email. */}
                                        <div className="mt-2 sm:hidden">
                                            <StatusBadges user={user} isSelf={isSelf} />
                                        </div>
                                    </td>
                                    <td className="hidden px-4 py-3 sm:table-cell">
                                        <StatusBadges user={user} isSelf={isSelf} />
                                    </td>
                                    <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground md:table-cell">
                                        {dateFormat.format(user.createdAt)}
                                    </td>
                                    <td className="w-12 px-2 py-3 text-right">
                                        {/* Your own account is managed from the account menu. */}
                                        <UserActions
                                            user={user}
                                            disabled={isSelf || action.isPending}
                                            onAction={(type) => handleAction(user, type)}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {users.isPending && (
                    <div className="flex justify-center p-8">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                )}
                {users.data && users.data.users.length === 0 && (
                    <p className="p-8 text-center text-muted-foreground">{t('admin:noUsers')}</p>
                )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
                <span>{t('admin:accountCount', { count: total })}</span>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label={t('admin:previousPage')}
                        disabled={page === 0}
                        onClick={() => setPage(page - 1)}
                    >
                        <ChevronLeft />
                    </Button>
                    <span>
                        {t('admin:page', {
                            page: formatNumber(page + 1),
                            total: formatNumber(pageCount),
                        })}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label={t('admin:nextPage')}
                        disabled={page + 1 >= pageCount}
                        onClick={() => setPage(page + 1)}
                    >
                        <ChevronRight />
                    </Button>
                </div>
            </div>

            {banning && (
                <BanUserDialog
                    user={banning}
                    onCancel={() => setBanning(null)}
                    onBan={async (reason, days) => {
                        await ban.mutateAsync({ user: banning, reason, days });
                        setBanning(null);
                    }}
                />
            )}
        </main>
    );
}
