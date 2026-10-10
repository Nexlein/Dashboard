import { getErrorMessage, notice } from '@/i18n/errors';
import { useTranslation } from 'react-i18next';
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

export default function ServicesPage() {
    const { t } = useTranslation(['common', 'services']);
    const linkError = new URLSearchParams(useLocation().search).get('error');
    const [error, setError] = useState<unknown>(
        linkError
            ? notice(
                  linkError === 'account_already_linked_to_different_user'
                      ? 'services:alreadyLinked'
                      : 'services:linkFailed',
              )
            : null,
    );

    const { data: services = [], isLoading: loading, isError, error: queryError } = useServices();
    const connectMutation = useConnectService();
    const disconnectMutation = useDisconnectService();

    async function handleConnect(serviceName: string, apiKey: string): Promise<void> {
        await connectMutation.mutateAsync(
            { serviceName, apiKey },
            {
                onSuccess: () => setError(null),
                onError: (err: Error) => setError(err),
            },
        );
    }

    async function handleDisconnect(serviceName: string) {
        return disconnectMutation.mutateAsync(serviceName, {
            onSuccess: () => setError(null),
            onError: (err: Error) => setError(err),
        });
    }

    const configurableServices = services.filter(
        (service: ServiceConnection) => service.configurable,
    );

    return (
        <main
            id="main-content"
            tabIndex={-1}
            className="outline-none mx-auto w-full max-w-5xl p-4 sm:p-8"
        >
            <div className="mb-8">
                <h1 className="text-3xl font-semibold tracking-tight">{t('common:services')}</h1>
                <p className="mt-2 text-muted-foreground">{t('services:subtitle')}</p>
            </div>

            {(Boolean(error) || isError) && (
                <div
                    role="alert"
                    className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {getErrorMessage(error || queryError)}
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
