import { formatDate } from '@/i18n/format';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ServiceConnection } from '@/features/services/lib/services';
import { ConnectedAccounts } from '@/features/services/components/ConnectedAccounts';
import { ServiceLogo } from './ServiceLogo';

interface ServiceCardProps {
    service: ServiceConnection;
    onConnect: (serviceName: string, apiKey: string) => Promise<void>;
    onDisconnect: (serviceName: string) => Promise<void>;
    setError: (error: unknown) => void;
}

export function ServiceCard({ service, onConnect, onDisconnect, setError }: ServiceCardProps) {
    useTranslation();
    const [apiKey, setApiKey] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const isOAuth = service.connectionType === 'oauth';
    const showForm = !service.connected || isEditing;

    const handleConnectClick = async () => {
        if (!apiKey.trim()) return;
        setIsSaving(true);
        try {
            await onConnect(service.name, apiKey);
            setApiKey('');
            setIsEditing(false);
        } catch (err) {
            setError(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnectClick = async () => {
        if (!window.confirm(i18n.t('services:disconnectConfirm', { service: service.displayName })))
            return;
        setIsSaving(true);
        try {
            await onDisconnect(service.name);
            setIsEditing(false);
        } catch (err) {
            setError(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b">
                <div className="flex items-center gap-3">
                    <ServiceLogo name={service.name} displayName={service.displayName} />
                    <div>
                        <CardTitle>{service.displayName}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {isOAuth
                                ? service.accounts?.length
                                    ? i18n.t('services:connectedAccounts', {
                                          count: service.accounts.length,
                                      })
                                    : i18n.t('services:githubDescription')
                                : service.verifiedAt
                                  ? i18n.t('services:connectedOn', {
                                        date: formatDate(new Date(service.verifiedAt), {
                                            dateStyle: 'medium',
                                        }),
                                    })
                                  : service.name === 'crypto'
                                    ? i18n.t('services:cryptoDescription')
                                    : service.name === 'stocks'
                                      ? i18n.t('services:stocksDescription')
                                      : service.name === 'weather'
                                        ? i18n.t('services:weatherDescription')
                                        : i18n.t('services:otherDescription')}
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
                    {service.connected
                        ? i18n.t('services:connected')
                        : i18n.t('services:notConnected')}
                </span>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
                {isOAuth && <ConnectedAccounts service={service} setError={setError} />}

                {!isOAuth && service.connected && !showForm && (
                    <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
                        <CheckCircle2 className="size-5 text-emerald-500" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{i18n.t('services:keyVerified')}</p>
                            <p className="text-xs text-muted-foreground">
                                {i18n.t('services:keyHint', { hint: service.keyHint })}
                            </p>
                        </div>
                    </div>
                )}

                {showForm && !isOAuth && (
                    <div className="space-y-2">
                        <Label htmlFor={`${service.name}-api-key`}>
                            {service.name === 'crypto'
                                ? i18n.t('services:cryptoApiKey')
                                : i18n.t('services:providerKey', { service: service.displayName })}
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id={`${service.name}-api-key`}
                                type="password"
                                autoComplete="off"
                                placeholder={i18n.t('services:apiKeyPlaceholder')}
                                value={apiKey}
                                onChange={(event) => setApiKey(event.target.value)}
                            />
                            <Button
                                onClick={handleConnectClick}
                                disabled={isSaving || !apiKey.trim()}
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : <KeyRound />}
                                {service.connected
                                    ? i18n.t('services:replace')
                                    : i18n.t('services:connect')}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {i18n.t('services:keySecurity')}
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    {service.connected && !showForm && !isOAuth && (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                            {i18n.t('services:replaceKey')}
                        </Button>
                    )}
                    {service.connected && !isOAuth && (
                        <Button
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={isSaving}
                            onClick={handleDisconnectClick}
                        >
                            <Unplug />
                            {i18n.t('services:disconnect')}
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
                            {i18n.t('services:getKey')}
                            <ExternalLink />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
