import { useEffect, useState } from 'react';
import { CheckCircle2, CloudSun, ExternalLink, KeyRound, Loader2, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Github } from '@/components/ui/Github';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    connectService,
    disconnectService,
    fetchServices,
    getOAuthUrl,
    type ServiceConnection,
} from '@/lib/services';

export default function ServicesPage() {
    const [services, setServices] = useState<ServiceConnection[]>([]);
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [editing, setEditing] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchServices()
            .then(setServices)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    async function handleConnect(service: ServiceConnection) {
        const apiKey = apiKeys[service.name]?.trim();
        if (!apiKey) return;

        setSaving(service.name);
        setError(null);
        try {
            const updated = await connectService(service.name, apiKey);
            setServices((current) =>
                current.map((item) => (item.name === service.name ? updated : item)),
            );
            setApiKeys((current) => ({ ...current, [service.name]: '' }));
            setEditing((current) => ({ ...current, [service.name]: false }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to connect service');
        } finally {
            setSaving(null);
        }
    }

    async function handleDisconnect(service: ServiceConnection) {
        if (!window.confirm(`Disconnect ${service.displayName}?`)) return;

        setSaving(service.name);
        setError(null);
        try {
            await disconnectService(service.name);
            setServices((current) =>
                current.map((item) =>
                    item.name === service.name
                        ? { ...item, connected: false, keyHint: null, verifiedAt: null }
                        : item,
                ),
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to disconnect service');
        } finally {
            setSaving(null);
        }
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
                    {configurableServices.map((service) => {
                        const showForm = !service.connected || editing[service.name];
                        const isSaving = saving === service.name;

                        return (
                            <Card key={service.name}>
                                <CardHeader className="flex flex-row items-start justify-between gap-4 border-b">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                                            {service.name === 'github' ? (
                                                <Github className="size-6" />
                                            ) : (
                                                <CloudSun className="size-6" />
                                            )}
                                        </span>
                                        <div>
                                            <CardTitle>{service.displayName}</CardTitle>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {service.name === 'github'
                                                    ? 'Statistiques et activité des dépôts'
                                                    : 'Current weather and forecasts'}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                            service.connected
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {service.connected ? 'Connected' : 'Not connected'}
                                    </span>
                                </CardHeader>
                                <CardContent className="space-y-4 p-5">
                                    {service.connected && !showForm && (
                                        <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
                                            <CheckCircle2 className="size-5 text-emerald-500" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium">
                                                    {service.connectionType === 'oauth'
                                                        ? 'Compte lié'
                                                        : 'API key verified'}
                                                </p>
                                                {service.accountInfo && (
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <img
                                                            src={service.accountInfo.avatarUrl}
                                                            alt={service.accountInfo.username}
                                                            className="size-5 rounded-full"
                                                        />
                                                        <p className="text-xs font-medium text-muted-foreground">
                                                            {service.accountInfo.username}
                                                        </p>
                                                    </div>
                                                )}
                                                {service.connectionType !== 'oauth' && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Key ending in ••••{service.keyHint}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {showForm && service.connectionType === 'oauth' && (
                                        <div className="space-y-2">
                                            <Button
                                                onClick={async () => {
                                                    try {
                                                        const url = await getOAuthUrl(service.name);
                                                        window.location.href = url;
                                                    } catch (err) {
                                                        setError(
                                                            err instanceof Error
                                                                ? err.message
                                                                : 'Unable to start linking flow',
                                                        );
                                                    }
                                                }}
                                                className="w-full"
                                                variant="outline"
                                            >
                                                <ExternalLink className="mr-2 size-4" />
                                                Lier mon compte {service.displayName}
                                            </Button>
                                            <p className="text-xs text-muted-foreground">
                                                Vous allez être redirigé vers {service.displayName}{' '}
                                                pour autoriser l'accès.
                                            </p>
                                        </div>
                                    )}

                                    {showForm && service.connectionType !== 'oauth' && (
                                        <div className="space-y-2">
                                            <Label htmlFor={`${service.name}-api-key`}>
                                                {service.credentialLabel || 'API key'}
                                            </Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id={`${service.name}-api-key`}
                                                    type="password"
                                                    autoComplete="off"
                                                    placeholder="Paste your API key"
                                                    value={apiKeys[service.name] || ''}
                                                    onChange={(event) =>
                                                        setApiKeys((current) => ({
                                                            ...current,
                                                            [service.name]: event.target.value,
                                                        }))
                                                    }
                                                />
                                                <Button
                                                    onClick={() => handleConnect(service)}
                                                    disabled={
                                                        isSaving || !apiKeys[service.name]?.trim()
                                                    }
                                                >
                                                    {isSaving ? (
                                                        <Loader2 className="animate-spin" />
                                                    ) : (
                                                        <KeyRound />
                                                    )}
                                                    {service.connected ? 'Replace' : 'Connect'}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                The key is verified, encrypted and never displayed
                                                again.
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2">
                                        {service.connected &&
                                            !showForm &&
                                            service.connectionType !== 'oauth' && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        setEditing((current) => ({
                                                            ...current,
                                                            [service.name]: true,
                                                        }))
                                                    }
                                                >
                                                    Replace key
                                                </Button>
                                            )}
                                        {service.connected && (
                                            <Button
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive"
                                                disabled={isSaving}
                                                onClick={() => handleDisconnect(service)}
                                            >
                                                <Unplug />
                                                Disconnect
                                            </Button>
                                        )}
                                        {service.documentationUrl && (
                                            <Button
                                                variant="link"
                                                className="ml-auto px-0"
                                                render={
                                                    <a
                                                        href={service.documentationUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    />
                                                }
                                            >
                                                Get an API key
                                                <ExternalLink />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
