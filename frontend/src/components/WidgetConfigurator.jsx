import { useState } from 'react';
import { KeyRound, Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import {
    createWidget,
    getDefaultWidgetLayout,
    MIN_REFRESH_RATE_SECONDS,
    toDashboardWidget,
} from '@/lib/widgets';
import { fetchServices } from '@/lib/services';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const SERVICES = {
    weather: {
        name: 'Weather',
        widgets: [
            { id: 'current_weather', name: 'Current Temperature' },
            { id: 'forecast', name: '5-Day Forecast' },
        ],
        params: [{ id: 'city', label: 'City Name', type: 'text', placeholder: 'e.g. Paris' }],
    },
    github: {
        name: 'GitHub',
        widgets: [
            { id: 'github-repo', name: 'Repository Stats' },
            { id: 'github-user', name: 'User Profile' },
        ],
        params: [
            {
                id: 'repo',
                label: 'Repository Name',
                type: 'text',
                placeholder: 'e.g. facebook/react',
            },
        ],
    },
    youtube: {
        name: 'YouTube',
        widgets: [{ id: 'youtube-stats', name: 'Channel Stats' }],
        params: [
            {
                id: 'channel',
                label: 'Channel ID',
                type: 'text',
                placeholder: 'e.g. UCX6OQ3DkcsbYNE6H8uQQuVA',
            },
        ],
    },
};

function areParamsComplete(service, params) {
    return SERVICES[service]?.params?.every((param) => params[param.id]?.trim()) ?? false;
}

function isRefreshRateValid(refreshTimer) {
    const refreshRate = Number(refreshTimer);
    return Number.isInteger(refreshRate) && refreshRate >= MIN_REFRESH_RATE_SECONDS;
}

export function WidgetConfigurator() {
    const navigate = useNavigate();
    const addWidget = useStore((state) => state.addWidget);
    const [open, setOpen] = useState(false);
    const [service, setService] = useState('');
    const [widgetType, setWidgetType] = useState('');
    const [params, setParams] = useState({});
    const [refreshTimer, setRefreshTimer] = useState('60'); // seconds
    const [serviceConnections, setServiceConnections] = useState([]);
    const [connectionsLoading, setConnectionsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleOpenChange = (nextOpen) => {
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

    const handleServiceChange = (val) => {
        setService(val);
        setWidgetType('');
        setParams({});
        setError('');
    };

    const handleSave = async () => {
        if (
            !service ||
            !widgetType ||
            !areParamsComplete(service, params) ||
            !serviceConnected ||
            !isRefreshRateValid(refreshTimer)
        )
            return;

        try {
            const apiWidget = await createWidget({
                serviceName: service,
                widgetName: widgetType,
                params,
                refreshRate: parseInt(refreshTimer, 10),
                layout: getDefaultWidgetLayout(service, widgetType),
            });

            addWidget(toDashboardWidget(apiWidget));

            setOpen(false);
            // Reset form
            setService('');
            setWidgetType('');
            setParams({});
            setRefreshTimer('60');
        } catch (error) {
            setError(error.message || 'Failed to create widget');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="h-11 px-4" aria-label="Add widget">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Widget
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Configure New Widget</DialogTitle>
                    <DialogDescription>
                        Select a service and widget type, then configure its parameters.
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
                                {Object.entries(SERVICES).map(([key, svc]) => (
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
                                        <p className="font-medium">OpenWeather is not connected</p>
                                        <p className="mt-1 text-muted-foreground">
                                            Add and verify your personal API key before creating a
                                            weather widget.
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
                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor="widgetType">Widget Type</Label>
                                <Select value={widgetType} onValueChange={setWidgetType}>
                                    <SelectTrigger id="widgetType">
                                        <SelectValue placeholder="Select a widget type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SERVICES[service].widgets.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>
                                                {w.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}

                    {connectionsLoading && service && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Checking service connection…
                        </div>
                    )}

                    {widgetType &&
                        SERVICES[service]?.params?.map((param) => (
                            <div
                                className="grid gap-2 animate-in fade-in slide-in-from-top-2"
                                key={param.id}
                            >
                                <Label htmlFor={param.id}>{param.label}</Label>
                                <Input
                                    id={param.id}
                                    type={param.type}
                                    placeholder={param.placeholder}
                                    value={params[param.id] || ''}
                                    onChange={(e) =>
                                        setParams({ ...params, [param.id]: e.target.value })
                                    }
                                />
                            </div>
                        ))}

                    {widgetType && (
                        <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                            <Label htmlFor="refreshTimer">Refresh Interval (seconds)</Label>
                            <Input
                                id="refreshTimer"
                                type="number"
                                min={MIN_REFRESH_RATE_SECONDS}
                                value={refreshTimer}
                                onChange={(e) => setRefreshTimer(e.target.value)}
                            />
                        </div>
                    )}

                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        disabled={
                            !service ||
                            !widgetType ||
                            !areParamsComplete(service, params) ||
                            !serviceConnected ||
                            connectionsLoading ||
                            !isRefreshRateValid(refreshTimer)
                        }
                        onClick={handleSave}
                    >
                        Add to Dashboard
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
