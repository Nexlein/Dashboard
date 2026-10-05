import { ExternalLink, Loader2, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ServiceConnection } from '@/features/services/lib/services';
import { useDisconnectAccount, useOAuthUrl } from '@/features/services/hooks/useServices';

type ConnectedAccountsProps = {
    service: ServiceConnection;
    setError: (error: string) => void;
};

const errorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

/**
 * The accounts connected to an OAuth service (e.g. several GitHub accounts): each one can be
 * removed, and another one connected. Separate from signing in with that provider.
 */
export function ConnectedAccounts({ service, setError }: ConnectedAccountsProps) {
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
                onError: (err) => setError(errorMessage(err, 'Unable to start linking flow')),
            },
        );
    }

    function removeAccount(accountId: number, label: string) {
        if (!window.confirm(`Disconnect ${label} from ${service.displayName}?`)) return;
        remove.mutate(
            { serviceName: service.name, accountId },
            { onError: (err) => setError(errorMessage(err, 'Unable to disconnect account')) },
        );
    }

    return (
        <div className="space-y-3">
            {accounts.length > 0 && (
                <ul className="space-y-2" aria-label={`${service.displayName} accounts`}>
                    {accounts.map((account) => {
                        const label = account.login ?? 'Account no longer accessible';
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
                                            Remove it, then connect it again.
                                        </p>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    aria-label={`Disconnect ${label}`}
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
                    ? `Connect another ${service.displayName} account`
                    : `Connect a ${service.displayName} account`}
            </Button>
            <p className="text-xs text-muted-foreground">
                Connect each account whose data your widgets show: {service.displayName} asks which
                account to use, and lets you sign in to another one. This is separate from signing
                in to the Dashboard with {service.displayName}.
            </p>
        </div>
    );
}
