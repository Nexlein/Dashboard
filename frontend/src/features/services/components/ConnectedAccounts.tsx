import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Loader2, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ServiceConnection } from '@/features/services/lib/services';
import { useDisconnectAccount, useOAuthUrl } from '@/features/services/hooks/useServices';

type ConnectedAccountsProps = {
    service: ServiceConnection;
    setError: (error: unknown) => void;
};

/**
 * The accounts connected to an OAuth service (e.g. several GitHub accounts): each one can be
 * removed, and another one connected. Separate from signing in with that provider.
 */
export function ConnectedAccounts({ service, setError }: ConnectedAccountsProps) {
    useTranslation();
    const accounts = service.accounts ?? [];
    const connect = useOAuthUrl();
    const remove = useDisconnectAccount();

    function connectAccount() {
        if (!service.provider) return;
        connect.mutate(
            { provider: service.provider, serviceName: service.name },
            {
                onSuccess: (url) => {
                    window.location.href = url;
                },
                onError: (err) => setError(err),
            },
        );
    }

    function removeAccount(accountId: number, label: string) {
        if (
            !window.confirm(
                i18n.t('services:disconnectAccountConfirm', {
                    name: label,
                    service: service.displayName,
                }),
            )
        )
            return;
        remove.mutate(
            { serviceName: service.name, accountId },
            { onError: (err) => setError(err) },
        );
    }

    return (
        <div className="space-y-3">
            {accounts.length > 0 && (
                <ul
                    className="space-y-2"
                    aria-label={i18n.t('services:accounts', { service: service.displayName })}
                >
                    {accounts.map((account) => {
                        const label = account.login ?? i18n.t('services:unavailableAccount');
                        return (
                            <li
                                key={account.id}
                                className="flex items-center gap-3 rounded-lg bg-muted/60 p-3"
                            >
                                {account.avatarUrl ? (
                                    <img
                                        src={account.avatarUrl}
                                        alt=""
                                        className="size-8 rounded-full"
                                    />
                                ) : (
                                    <UserRound className="size-8 rounded-full bg-muted p-1.5 text-muted-foreground" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{label}</p>
                                    {!account.login && (
                                        <p className="text-xs text-muted-foreground">
                                            {i18n.t('services:reconnectHint')}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    aria-label={i18n.t('services:disconnectAccount', {
                                        name: label,
                                    })}
                                    disabled={remove.isPending}
                                    onClick={() => removeAccount(account.id, label)}
                                >
                                    <Trash2 />
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            )}
            <Button
                disabled={connect.isPending || !service.provider}
                onClick={connectAccount}
                className="w-full"
                variant="outline"
            >
                {connect.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                    <ExternalLink className="mr-2 size-4" />
                )}
                {accounts.length
                    ? i18n.t('services:connectAnother', { service: service.displayName })
                    : i18n.t('services:connectAccount', { service: service.displayName })}
            </Button>
            <p className="text-xs text-muted-foreground">
                {i18n.t('services:accountsHint', { service: service.displayName })}
            </p>
        </div>
    );
}
