import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    connectService,
    disconnectService,
    fetchServices,
    type ServiceConnection,
} from '@/lib/services';
import { ServiceCard } from '@/features/services/ServiceCard';

export default function ServicesPage() {
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);

    const {
        data: services = [],
        isLoading: loading,
        isError,
        error: queryError,
    } = useQuery({
        queryKey: ['services'],
        queryFn: fetchServices,
    });

    const connectMutation = useMutation({
        mutationFn: ({ serviceName, apiKey }: { serviceName: string; apiKey: string }) =>
            connectService(serviceName, apiKey),
        onSuccess: (updatedService) => {
            setError(null);
            queryClient.setQueryData(
                ['services'],
                (old: ServiceConnection[] | undefined) =>
                    old?.map((item) =>
                        item.name === updatedService.name ? updatedService : item,
                    ) || [],
            );
        },
        onError: (err: Error) => setError(err.message),
    });

    const disconnectMutation = useMutation({
        mutationFn: (serviceName: string) => disconnectService(serviceName).then(() => serviceName),
        onSuccess: (serviceName) => {
            setError(null);
            queryClient.setQueryData(
                ['services'],
                (old: ServiceConnection[] | undefined) =>
                    old?.map((item) =>
                        item.name === serviceName
                            ? { ...item, connected: false, keyHint: null, verifiedAt: null }
                            : item,
                    ) || [],
            );
        },
        onError: (err: Error) => setError(err.message),
    });

    async function handleConnect(serviceName: string, apiKey: string) {
        return connectMutation.mutateAsync({ serviceName, apiKey });
    }

    async function handleDisconnect(serviceName: string) {
        return disconnectMutation.mutateAsync(serviceName);
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
