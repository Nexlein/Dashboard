import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import {
    useServices,
    useConnectService,
    useDisconnectService,
} from '@/features/services/hooks/useServices';
import type { ServiceConnection } from '@/features/services/lib/services';
import { ServiceCard } from '@/features/services/components/ServiceCard';

/** Error codes GitHub linking sends back in `?error=` (Better Auth). */
const LINK_ERRORS: Record<string, string> = {
    account_already_linked_to_different_user:
        'This GitHub account is already linked to another Dashboard account.',
};

export default function ServicesPage() {
    const linkError = new URLSearchParams(useLocation().search).get('error');
    const [error, setError] = useState<string | null>(
        linkError ? (LINK_ERRORS[linkError] ?? 'Linking the account failed. Try again.') : null,
    );

    const { data: services = [], isLoading: loading, isError, error: queryError } = useServices();
    const connectMutation = useConnectService();
    const disconnectMutation = useDisconnectService();

    async function handleConnect(serviceName: string, apiKey: string): Promise<void> {
        await connectMutation.mutateAsync(
            { serviceName, apiKey },
            {
                onSuccess: () => setError(null),
                onError: (err: Error) => setError(err.message),
            },
        );
    }

    async function handleDisconnect(serviceName: string) {
        return disconnectMutation.mutateAsync(serviceName, {
            onSuccess: () => setError(null),
            onError: (err: Error) => setError(err.message),
        });
    }

    const configurableServices = services.filter(
        (service: ServiceConnection) => service.configurable,
    );

    return (
        <main className="mx-auto w-full max-w-5xl p-4 sm:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-semibold tracking-tight">Services</h1>
                <p className="mt-2 text-muted-foreground">
                    Connect your own provider credentials before adding their widgets.
                </p>
            </div>

            {(error || isError) && (
                <div
                    role="alert"
                    className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {error || (queryError as Error)?.message}
                </div>
            )}

            {loading ? (
                <div className="flex min-h-40 items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2">
                    {configurableServices.map((service: ServiceConnection) => (
                        <ServiceCard
                            key={service.name}
                            service={service}
                            onConnect={handleConnect}
                            onDisconnect={handleDisconnect}
                            setError={setError}
                        />
                    ))}
                </div>
            )}
        </main>
    );
}
