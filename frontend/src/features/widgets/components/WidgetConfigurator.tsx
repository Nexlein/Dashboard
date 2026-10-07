import { getErrorMessage } from '@/i18n/errors';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { useAddWidget } from '@/features/widgets/hooks/useWidgets';
import {
    getDefaultWidgetLayout,
    isRefreshRateValid,
    MIN_REFRESH_RATE_SECONDS,
    type WidgetParams,
} from '@/features/widgets/lib/widgets';
import { fetchServices, type ServiceConnection } from '@/features/services/lib/services';
import { ServiceLogo } from '@/features/services/components/ServiceLogo';
import { useWidgetCatalog } from '@/features/widgets/hooks/useWidgetCatalog';
import { findCatalogWidget } from '@/features/widgets/lib/catalog';
import type { WidgetDefinition } from '@/features/widgets/lib/types';
import { WidgetForm } from './WidgetForm';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

function areParamsComplete(widgetDef: WidgetDefinition | undefined, params: WidgetParams) {
    if (!widgetDef) return false;
    return widgetDef.params.every((param) => {
        if (param.optional) return true;
        const val = params[param.id];
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === 'string') return val.trim().length > 0;
        return !!val;
    });
}

export function WidgetConfigurator({ initialOpen = false }: { initialOpen?: boolean }) {
    const { t } = useTranslation('widgets');
    const navigate = useNavigate();
    const addWidgetMutation = useAddWidget();

    const [open, setOpen] = useState(initialOpen);
    const [service, setService] = useState('');
    const [widgetType, setWidgetType] = useState('');
    const [params, setParams] = useState<WidgetParams>({});
    const [refreshTimer, setRefreshTimer] = useState('60'); // seconds
    const [serviceConnections, setServiceConnections] = useState<ServiceConnection[]>([]);
    const [connectionsLoading, setConnectionsLoading] = useState(false);
    const [error, setError] = useState<unknown>('');
    const catalog = useWidgetCatalog(open);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (!nextOpen) return;

        setError('');
        setConnectionsLoading(true);
        fetchServices()
            .then(setServiceConnections)
            .catch((err) => setError(err))
            .finally(() => setConnectionsLoading(false));
    };

    const selectedConnection = serviceConnections.find((item) => item.name === service);
    const serviceConnectionRequired = service === 'weather' || selectedConnection?.configurable;
    const serviceConnected = !serviceConnectionRequired || selectedConnection?.connected === true;

    const handleWidgetTypeChange = (type: string, serviceName = service) => {
        setWidgetType(type);
        const definition = findCatalogWidget(catalog.data, serviceName, type)?.widget;
        setParams(
            Object.fromEntries(
                (definition?.params ?? [])
                    .filter((param) => param.defaultValue !== undefined)
                    .map((param) => [param.id, param.defaultValue]),
            ),
        );
    };

    const handleServiceChange = (val: string) => {
        setService(val);
        const widgets = catalog.data?.find((item) => item.id === val)?.widgets ?? [];
        if (widgets.length === 1) {
            handleWidgetTypeChange(widgets[0].id, val);
        } else {
            handleWidgetTypeChange('', val);
        }
        setError('');
    };

    const serviceDef = catalog.data?.find((item) => item.id === service);
    const widgetDef = findCatalogWidget(catalog.data, service, widgetType)?.widget;

    const handleSave = () => {
        if (
            !service ||
            !widgetType ||
            !areParamsComplete(widgetDef, params) ||
            !isRefreshRateValid(refreshTimer, serviceDef, widgetDef)
        ) {
            return;
        }

        setError('');

        addWidgetMutation.mutate(
            {
                serviceName: service,
                widgetName: widgetType,
                params: params,
                refreshRate:
                    (widgetDef?.hasRefresh ?? serviceDef?.hasRefresh) === false
                        ? MIN_REFRESH_RATE_SECONDS
                        : Number(refreshTimer),
                layout: getDefaultWidgetLayout(service, widgetType),
            },
            {
                onSuccess: () => {
                    setService('');
                    setWidgetType('');
                    setParams({});
                    setRefreshTimer('60');
                    setOpen(false);
                },
                onError: (err: Error) => {
                    setError(err);
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="h-11 rounded-xl px-3">{t('add')}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>{t('addTitle')}</DialogTitle>
                    <DialogDescription>{t('addSubtitle')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="service">{t('service')}</Label>
                        <Select
                            value={service}
                            onValueChange={handleServiceChange}
                            disabled={!catalog.data}
                        >
                            <SelectTrigger id="service" className="text-left">
                                <SelectValue
                                    placeholder={
                                        catalog.isPending
                                            ? t('loadingServices')
                                            : t('selectService')
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {catalog.data?.map((svc) => (
                                    <SelectItem
                                        key={svc.id}
                                        value={svc.id}
                                        textValue={svc.name}
                                        className="pl-3 pr-8 [&>span:first-child]:left-auto [&>span:first-child]:right-2"
                                    >
                                        <span className="flex items-center gap-2">
                                            <ServiceLogo name={svc.id} size="sm" decorative />
                                            <span>{svc.name}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {catalog.isError && (
                            <p className="text-sm text-destructive" role="alert">
                                {t('servicesError', {
                                    error: getErrorMessage(catalog.error),
                                })}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="widgetType">{t('widgetType')}</Label>
                        <Select
                            value={widgetType}
                            onValueChange={(type) => handleWidgetTypeChange(type)}
                            disabled={!serviceDef || connectionsLoading || !serviceConnected}
                        >
                            <SelectTrigger id="widgetType">
                                <SelectValue placeholder={t('selectType')} />
                            </SelectTrigger>
                            <SelectContent>
                                {serviceDef?.widgets.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {w.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {service && serviceConnectionRequired && !serviceConnected && (
                        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm">
                            <div className="flex items-start gap-2">
                                <KeyRound className="mt-0.5 size-4 shrink-0 text-sky-500" />
                                <div>
                                    <p className="font-medium">
                                        {t('notConnected', {
                                            service: selectedConnection?.displayName || service,
                                        })}
                                    </p>
                                    <p className="mt-1 text-muted-foreground">
                                        {selectedConnection?.connectionType === 'oauth'
                                            ? t('linkAccountHint', {
                                                  service:
                                                      selectedConnection?.displayName || service,
                                              })
                                            : t('addKeyHint', {
                                                  service: serviceDef?.name || service,
                                              })}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="mt-3"
                                        onClick={() => {
                                            setOpen(false);
                                            navigate('/services');
                                        }}
                                    >
                                        {t('openServices')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {connectionsLoading && service && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            {t('checkingConnection')}
                        </div>
                    )}

                    {serviceDef && widgetDef && (
                        <WidgetForm
                            serviceDef={serviceDef}
                            widgetDef={widgetDef}
                            params={params}
                            setParams={setParams}
                            refreshTimer={refreshTimer}
                            setRefreshTimer={setRefreshTimer}
                        />
                    )}

                    {Boolean(error) && (
                        <p className="text-sm font-medium text-destructive">
                            {getErrorMessage(error)}
                        </p>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        disabled={
                            !service ||
                            !widgetType ||
                            !areParamsComplete(widgetDef, params) ||
                            !isRefreshRateValid(refreshTimer, serviceDef, widgetDef) ||
                            addWidgetMutation.isPending
                        }
                        onClick={handleSave}
                    >
                        {addWidgetMutation.isPending ? t('adding') : t('addDashboard')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
