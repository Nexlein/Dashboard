import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { useAddWidget } from '@/features/widgets/hooks/useWidgets';
import { MIN_REFRESH_RATE_SECONDS, getDefaultWidgetLayout } from '@/features/widgets/lib/widgets';
import { fetchServices } from '@/features/services/lib/services';
import { REGISTRY } from '@/features/widgets/lib/registry';
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

function areParamsComplete(service: string, widgetType: string, params: any) {
    if (!service || !widgetType) return false;
    const widgetInfo = REGISTRY[service]?.widgets?.find(
        (w: any) => w.id === widgetType || w.aliases?.includes(widgetType),
    );
    if (!widgetInfo || !widgetInfo.params) return true;
    return widgetInfo.params.every((param: any) => {
        if (param.label.includes('optional') || param.label.includes('leave empty')) return true;
        const val = params[param.id];
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === 'string') return val.trim().length > 0;
        return !!val;
    });
}

function isRefreshRateValid(refreshTimer: string, serviceDef: any) {
    if (serviceDef?.hasRefresh === false) return true;
    const refreshRate = Number(refreshTimer);
    return Number.isInteger(refreshRate) && refreshRate >= MIN_REFRESH_RATE_SECONDS;
}

export function WidgetConfigurator() {
    const navigate = useNavigate();
    const addWidgetMutation = useAddWidget();

    const [open, setOpen] = useState(false);
    const [service, setService] = useState('');
    const [widgetType, setWidgetType] = useState('');
    const [params, setParams] = useState<any>({});
    const [refreshTimer, setRefreshTimer] = useState('60'); // seconds
    const [serviceConnections, setServiceConnections] = useState<any[]>([]);
    const [connectionsLoading, setConnectionsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (!nextOpen) return;

        setError('');
        setConnectionsLoading(true);
        fetchServices()
            .then(setServiceConnections)
            .catch((err) => setError(err.message))
            .finally(() => setConnectionsLoading(false));
    };

    const selectedConnection = serviceConnections.find((item) => item.name === service);
    const serviceConnectionRequired = service === 'weather' || selectedConnection?.configurable;
    const serviceConnected = !serviceConnectionRequired || selectedConnection?.connected === true;

    const handleServiceChange = (val: string) => {
        setService(val);
        const widgets = REGISTRY[val]?.widgets || [];
        if (widgets.length === 1) {
            setWidgetType(widgets[0].id);
        } else {
            setWidgetType('');
        }
        setParams({});
        setError('');
    };

    const serviceDef = REGISTRY[service];
    const widgetDef = serviceDef?.widgets?.find(
        (w: any) => w.id === widgetType || w.aliases?.includes(widgetType),
    );

    const handleSave = () => {
        if (
            !service ||
            !widgetType ||
            !areParamsComplete(service, widgetType, params) ||
            !isRefreshRateValid(refreshTimer, serviceDef)
        ) {
            return;
        }

        setError('');

        addWidgetMutation.mutate(
            {
                serviceName: service,
                widgetName: widgetType,
                params: params,
                refreshRate: Number(refreshTimer),
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
                onError: (err: any) => {
                    setError(err.message || 'Failed to create widget');
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>Add Widget</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Widget</DialogTitle>
                    <DialogDescription>
                        Configure a new widget for your dashboard.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="service">Service</Label>
                        <Select value={service} onValueChange={handleServiceChange}>
                            <SelectTrigger id="service">
                                <SelectValue placeholder="Select a service..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(REGISTRY).map(([key, svc]) => (
                                    <SelectItem key={key} value={key}>
                                        {svc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {service &&
                        (serviceConnectionRequired && !serviceConnected ? (
                            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm">
                                <div className="flex items-start gap-2">
                                    <KeyRound className="mt-0.5 size-4 shrink-0 text-sky-500" />
                                    <div>
                                        <p className="font-medium">
                                            {selectedConnection?.displayName || service} is not
                                            connected
                                        </p>
                                        <p className="mt-1 text-muted-foreground">
                                            {selectedConnection?.connectionType === 'oauth'
                                                ? `Please link your ${selectedConnection?.displayName || service} account in Services before creating this widget.`
                                                : `Add and verify your personal API key in Services before creating a ${service} widget.`}
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
                                            Open Services
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            REGISTRY[service]?.widgets?.length > 1 && (
                                <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                    <Label htmlFor="widgetType">Widget Type</Label>
                                    <Select value={widgetType} onValueChange={setWidgetType}>
                                        <SelectTrigger id="widgetType">
                                            <SelectValue placeholder="Select a widget type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {REGISTRY[service].widgets.map((w: any) => (
                                                <SelectItem key={w.id} value={w.id}>
                                                    {w.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )
                        ))}

                    {connectionsLoading && service && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Checking service connection…
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

                    {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <Button
                        disabled={
                            !service ||
                            !widgetType ||
                            !areParamsComplete(service, widgetType, params) ||
                            !isRefreshRateValid(refreshTimer, serviceDef) ||
                            addWidgetMutation.isPending
                        }
                        onClick={handleSave}
                    >
                        {addWidgetMutation.isPending ? 'Adding...' : 'Add to Dashboard'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
