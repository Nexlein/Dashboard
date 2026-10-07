import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { notice, getErrorMessage } from '@/i18n/errors';
import { useTranslation } from 'react-i18next';
import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '@/lib/theme';
import type { User } from 'shared';
import { deleteMyAccount, exportMyData } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
    ChevronDown,
    LayoutDashboard,
    LogOut,
    Plug,
    UserRound,
    Download,
    Trash2,
    Shield,
    ShieldCheck,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const WidgetConfigurator = lazy(() =>
    import('@/features/widgets/components/WidgetConfigurator').then((module) => ({
        default: module.WidgetConfigurator,
    })),
);
const ProfileSettingsModal = lazy(() =>
    import('@/components/ProfileSettingsModal').then((module) => ({
        default: module.ProfileSettingsModal,
    })),
);

export default function Navbar({
    user,
    onLogout,
    showWidgetConfigurator = true,
}: {
    user: User | null;
    onLogout: () => void;
    showWidgetConfigurator?: boolean;
}) {
    const { t } = useTranslation(['common', 'widgets']);
    const { theme } = useTheme();
    const [profileOpen, setProfileOpen] = useState(false);
    const [configuratorLoaded, setConfiguratorLoaded] = useState(false);
    const [privacyError, setPrivacyError] = useState<unknown>('');
    const [privacyBusy, setPrivacyBusy] = useState(false);
    const accountLabel = user?.name || user?.email || t('common:account');
    const initial = accountLabel.charAt(0).toUpperCase();

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        return () => {
            // Public pages must not inherit the previous user's visual preference.
            document.documentElement.classList.remove('dark');
        };
    }, [theme]);

    async function downloadData() {
        setPrivacyError('');
        setPrivacyBusy(true);
        try {
            const data = await exportMyData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'my-dashboard-data.json';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 0);
        } catch {
            setPrivacyError(notice('common:downloadError'));
        } finally {
            setPrivacyBusy(false);
        }
    }

    async function deleteAccount() {
        if (!window.confirm(t('common:deleteConfirmation'))) return;
        setPrivacyError('');
        setPrivacyBusy(true);
        try {
            await deleteMyAccount();
            onLogout();
        } catch (err) {
            setPrivacyError(
                (err as { code?: string }).code === 'SESSION_EXPIRED'
                    ? notice('common:deleteFreshSession')
                    : notice('common:deleteError'),
            );
        } finally {
            setPrivacyBusy(false);
        }
    }

    return (
        <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-1">
                <NavLink
                    to="/"
                    aria-label={t('common:dashboard')}
                    end
                    className={({ isActive }) =>
                        `flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                            isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`
                    }
                >
                    <LayoutDashboard className="size-4" />
                    <span className="hidden sm:inline">{t('common:dashboard')}</span>
                </NavLink>
                <NavLink
                    to="/services"
                    aria-label={t('common:services')}
                    className={({ isActive }) =>
                        `flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                            isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`
                    }
                >
                    <Plug className="size-4" />
                    <span className="hidden sm:inline">{t('common:services')}</span>
                </NavLink>
                {user?.role === 'admin' && (
                    <NavLink
                        to="/admin"
                        aria-label={t('common:administration')}
                        className={({ isActive }) =>
                            `flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`
                        }
                    >
                        <ShieldCheck className="size-4" />
                        <span className="hidden sm:inline">{t('common:administration')}</span>
                    </NavLink>
                )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
                {showWidgetConfigurator && (
                    <Suspense
                        fallback={
                            <Button disabled aria-busy="true" className="h-11 rounded-xl px-3">
                                {t('widgets:add')}
                            </Button>
                        }
                    >
                        {configuratorLoaded ? (
                            <WidgetConfigurator initialOpen />
                        ) : (
                            <Button
                                className="h-11 rounded-xl px-3"
                                onClick={() => setConfiguratorLoaded(true)}
                            >
                                {t('widgets:add')}
                            </Button>
                        )}
                    </Suspense>
                )}
                <ThemeSwitcher />

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                variant="outline"
                                className="h-11 min-w-0 gap-2 rounded-xl px-2.5 sm:px-3"
                                aria-label={t('common:accountMenu', { name: accountLabel })}
                            />
                        }
                    >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                            {user ? initial : <UserRound className="size-4" />}
                        </span>
                        <span className="max-w-28 truncate sm:max-w-40">{accountLabel}</span>
                        <ChevronDown className="size-4 text-muted-foreground" />
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" sideOffset={8} className="w-60 p-2">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="px-2 py-2">
                                <span className="block truncate text-sm font-medium text-foreground">
                                    {accountLabel}
                                </span>
                                {user?.name && (
                                    <span className="mt-0.5 block truncate font-normal">
                                        {user.email}
                                    </span>
                                )}
                            </DropdownMenuLabel>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <div className="flex justify-start px-2 py-1.5">
                                <LanguageSwitcher inMenu />
                            </div>
                        </DropdownMenuGroup>

                        <DropdownMenuItem
                            className="min-h-9 px-2 cursor-pointer"
                            onClick={() => setProfileOpen(true)}
                        >
                            <UserRound className="mr-2 size-4" />
                            {t('common:editProfile')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="px-2 pt-2">
                                {t('common:dataPrivacy')}
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                                className="min-h-9 px-2"
                                render={<NavLink to="/privacy" />}
                            >
                                <Shield className="mr-2 size-4" />
                                {t('common:privacyPolicy')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="min-h-9 px-2 cursor-pointer"
                                disabled={privacyBusy}
                                onClick={downloadData}
                            >
                                <Download className="mr-2 size-4" />
                                {t('common:downloadData')}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            className="min-h-9 px-2 cursor-pointer"
                            disabled={privacyBusy}
                            onClick={deleteAccount}
                        >
                            <Trash2 className="mr-2 size-4" />
                            {t('common:deleteAccount')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            variant="destructive"
                            className="min-h-9 px-2 cursor-pointer"
                            onClick={onLogout}
                        >
                            <LogOut className="mr-2 size-4" />
                            {t('common:signOut')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {Boolean(privacyError) && (
                <p role="alert" className="order-last w-full text-sm text-destructive">
                    {getErrorMessage(privacyError)}
                </p>
            )}
            {profileOpen && (
                <Suspense fallback={null}>
                    <ProfileSettingsModal
                        open={profileOpen}
                        onOpenChange={setProfileOpen}
                        user={user}
                        onUserUpdated={() => window.location.reload()}
                    />
                </Suspense>
            )}
        </nav>
    );
}
