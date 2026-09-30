import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
    connectService,
    disconnectService,
    fetchServices,
    type ServiceConnection,
} from '@/lib/services';
import { ServiceCard } from '@/features/services/ServiceCard';

export default function ServicesPage() {
    const [services, setServices] = useState<ServiceConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchServices()
            .then(setServices)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    async function handleConnect(serviceName: string, apiKey: string) {
        setError(null);
        const updated = await connectService(serviceName, apiKey);
        setServices((current) =>
            current.map((item) => (item.name === serviceName ? updated : item)),
        );
    }

    async function handleDisconnect(serviceName: string) {
        setError(null);
        await disconnectService(serviceName);
        setServices((current) =>
            current.map((item) =>
                item.name === serviceName
                    ? { ...item, connected: false, keyHint: null, verifiedAt: null }
                    : item,
            ),
        );
    }

    const configurableServices = services.filter((service) => service.configurable);

    return (
        <main className="mx-auto w-full max-w-5xl p-4 sm:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-semibold tracking-tight">Services</h1>
                <p className="mt-2 text-muted-foreground">
                    Connect your own provider credentials before adding their widgets.
                </p>
            </div>

            {error && (
                <div
                    role="alert"
                    className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex min-h-40 items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2">
                    {configurableServices.map((service) => (
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
