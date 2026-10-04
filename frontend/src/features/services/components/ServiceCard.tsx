import { useState } from 'react';
import {
    Bitcoin,
    CheckCircle2,
    CloudSun,
    ExternalLink,
    KeyRound,
    Loader2,
    Unplug,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Github } from '@/components/ui/Github';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ServiceConnection } from '@/features/services/lib/services';
import { useOAuthUrl } from '@/features/services/hooks/useServices';

interface ServiceCardProps {
    service: ServiceConnection;
    onConnect: (serviceName: string, apiKey: string) => Promise<void>;
    onDisconnect: (serviceName: string) => Promise<void>;
    setError: (error: string) => void;
}

export function ServiceCard({ service, onConnect, onDisconnect, setError }: ServiceCardProps) {
    const [apiKey, setApiKey] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const oauthMutation = useOAuthUrl();

    const showForm = !service.connected || isEditing;

    const handleConnectClick = async () => {
        if (!apiKey.trim()) return;
        setIsSaving(true);
        try {
            await onConnect(service.name, apiKey);
            setApiKey('');
            setIsEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to connect service');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnectClick = async () => {
        if (!window.confirm(`Disconnect ${service.displayName}?`)) return;
        setIsSaving(true);
        try {
            await onDisconnect(service.name);
            setIsEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to disconnect service');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b">
                <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                        {service.name === 'github' ? (
                            <Github className="size-6" />
                        ) : service.name === 'crypto' ? (
                            <Bitcoin className="size-6" />
                        ) : (
                            <CloudSun className="size-6" />
                        )}
                    </span>
                    <div>
                        <CardTitle>{service.displayName}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {service.description ||
                                (service.name === 'github'
                                    ? 'Statistiques et activité des dépôts'
                                    : 'Current weather and forecasts')}
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
                            disabled={oauthMutation.isPending}
                            onClick={() => {
                                oauthMutation.mutate(service.name, {
                                    onSuccess: (url) => {
                                        window.location.href = url;
                                    },
                                    onError: (err) => {
                                        setError(
                                            err instanceof Error
                                                ? err.message
                                                : 'Unable to start linking flow',
                                        );
                                    },
                                });
                            }}
                            className="w-full"
                            variant="outline"
                        >
                            {oauthMutation.isPending ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                                <ExternalLink className="mr-2 size-4" />
                            )}
                            Lier mon compte {service.displayName}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Vous allez être redirigé vers {service.displayName} pour autoriser
                            l'accès.
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
                                value={apiKey}
                                onChange={(event) => setApiKey(event.target.value)}
                            />
                            <Button
                                onClick={handleConnectClick}
                                disabled={isSaving || !apiKey.trim()}
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : <KeyRound />}
                                {service.connected ? 'Replace' : 'Connect'}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            The key is verified, encrypted and never displayed again.
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    {service.connected && !showForm && service.connectionType !== 'oauth' && (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                            Replace key
                        </Button>
                    )}
                    {service.connected && (
                        <Button
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={isSaving}
                            onClick={handleDisconnectClick}
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
}
