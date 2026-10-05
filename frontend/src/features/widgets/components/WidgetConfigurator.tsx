import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { useAddWidget } from '@/features/widgets/hooks/useWidgets';
import {
    getDefaultWidgetLayout,
    isRefreshRateValid,
    type WidgetParams,
} from '@/features/widgets/lib/widgets';
import { fetchServices, type ServiceConnection } from '@/features/services/lib/services';
import { ServiceLogo } from '@/features/services/components/ServiceLogo';
import {
    REGISTRY,
    findWidgetDefinition,
    getServiceDefinition,
} from '@/features/widgets/lib/registry';
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

function areParamsComplete(service: string, widgetType: string, params: WidgetParams) {
    if (!service || !widgetType) return false;
    const widgetInfo = findWidgetDefinition(service, widgetType);
    if (!widgetInfo) return true;
    return widgetInfo.params.every((param) => {
        if (param.label.includes('optional') || param.label.includes('leave empty')) return true;
        const val = params[param.id];
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === 'string') return val.trim().length > 0;
        return !!val;
    });
}

export function WidgetConfigurator() {
    const navigate = useNavigate();
    const addWidgetMutation = useAddWidget();

    const [open, setOpen] = useState(false);
    const [service, setService] = useState('');
    const [widgetType, setWidgetType] = useState('');
    const [params, setParams] = useState<WidgetParams>({});
    const [refreshTimer, setRefreshTimer] = useState('60'); // seconds
    const [serviceConnections, setServiceConnections] = useState<ServiceConnection[]>([]);
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

    const handleWidgetTypeChange = (type: string, serviceName = service) => {
        setWidgetType(type);
        const definition = findWidgetDefinition(serviceName, type);
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
        const widgets = getServiceDefinition(val)?.widgets ?? [];
        if (widgets.length === 1) {
            handleWidgetTypeChange(widgets[0].id, val);
        } else {
            handleWidgetTypeChange('', val);
        }
        setError('');
    };

    const serviceDef = getServiceDefinition(service);
    const widgetDef = findWidgetDefinition(service, widgetType);

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
                onError: (err: Error) => {
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
            <DialogContent className="sm:max-w-106.25">
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
                            <SelectTrigger id="service" className="text-left">
                                <SelectValue placeholder="Select a service..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(REGISTRY).map(([key, svc]) => (
                                    <SelectItem
                                        key={key}
                                        value={key}
                                        textValue={svc.name}
                                        className="pl-3 pr-8 [&>span:first-child]:left-auto [&>span:first-child]:right-2"
                                    >
                                        <span className="flex items-center gap-2">
                                            <ServiceLogo name={key} size="sm" decorative />
                                            <span>{svc.name}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="widgetType">Widget Type</Label>
                        <Select
                            value={widgetType}
                            onValueChange={(type) => handleWidgetTypeChange(type)}
                            disabled={!serviceDef || connectionsLoading || !serviceConnected}
                        >
                            <SelectTrigger id="widgetType">
                                <SelectValue placeholder="Select a widget type..." />
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
                    )}

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
