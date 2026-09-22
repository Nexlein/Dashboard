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
import { WidgetParameterField } from './WidgetParameterField';

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

export const SERVICES = {
    weather: {
        name: 'Weather',
        widgets: [
            {
                id: 'current_weather',
                name: 'Current Temperature',
                params: [
                    { id: 'city', label: 'City Name', type: 'text', placeholder: 'e.g. Paris' },
                ],
            },
            {
                id: 'forecast',
                name: '5-Day Forecast',
                params: [
                    { id: 'city', label: 'City Name', type: 'text', placeholder: 'e.g. Paris' },
                ],
            },
        ],
    },
    github: {
        name: 'GitHub',
        widgets: [
            {
                id: 'repo_stats',
                name: 'Repository Stats',
                params: [
                    {
                        id: 'owner',
                        label: 'Owner (Organization/User)',
                        type: 'text',
                        placeholder: 'e.g. facebook',
                    },
                    {
                        id: 'repo',
                        label: 'Repository Name',
                        type: 'text',
                        placeholder: 'e.g. react',
                    },
                ],
            },
            {
                id: 'latest_commits',
                name: 'Latest Commits',
                params: [
                    { id: 'owner', label: 'Owner', type: 'text', placeholder: 'e.g. facebook' },
                    {
                        id: 'repo',
                        label: 'Repository Name',
                        type: 'text',
                        placeholder: 'e.g. react',
                    },
                    {
                        id: 'branch',
                        label: 'Branch (optional)',
                        type: 'text',
                        placeholder: 'e.g. main',
                    },
                ],
            },
            {
                id: 'user_profile',
                name: 'User Profile',
                params: [
                    {
                        id: 'username',
                        label: 'GitHub Username (leave empty for your profile)',
                        type: 'text',
                        placeholder: 'e.g. nexlein',
                    },
                ],
            },
        ],
    },
    crypto: {
        name: 'Crypto',
        widgets: [
            {
                id: 'crypto_price',
                name: 'Price & Market Stats',
                params: [
                    {
                        id: 'coin',
                        label: 'CoinGecko Coin ID',
                        type: 'text',
                        placeholder: 'e.g. bitcoin, ethereum, solana',
                    },
                    {
                        id: 'currency',
                        label: 'Currency',
                        type: 'text',
                        placeholder: 'e.g. eur or usd',
                    },
                ],
            },
            {
                id: 'crypto_chart',
                name: 'Market Comparison Chart',
                params: [
                    {
                        id: 'coins',
                        label: 'Cryptocurrencies',
                        type: 'coin-multiselect',
                        placeholder: 'CoinGecko ID, e.g. dogecoin',
                        options: [
                            { value: 'bitcoin', label: 'BTC' },
                            { value: 'ethereum', label: 'ETH' },
                            { value: 'solana', label: 'SOL' },
                            { value: 'binancecoin', label: 'BNB' },
                            { value: 'ripple', label: 'XRP' },
                            { value: 'cardano', label: 'ADA' },
                            { value: 'dogecoin', label: 'DOGE' },
                            { value: 'avalanche-2', label: 'AVAX' },
                            { value: 'chainlink', label: 'LINK' },
                            { value: 'polkadot', label: 'DOT' },
                        ],
                    },
                    {
                        id: 'currency',
                        label: 'Currency',
                        type: 'select',
                        placeholder: 'Select a currency',
                        options: [
                            { value: 'eur', label: 'EUR (€)' },
                            { value: 'usd', label: 'USD ($)' },
                            { value: 'gbp', label: 'GBP (£)' },
                        ],
                    },
                    {
                        id: 'days',
                        label: 'Period',
                        type: 'select',
                        placeholder: 'Select a period',
                        options: [
                            { value: '7', label: '1 week' },
                            { value: '30', label: '1 month' },
                            { value: '90', label: '3 months' },
                            { value: '365', label: '1 year' },
                        ],
                    },
                ],
            },
        ],
    },
};

function areParamsComplete(service, widgetType, params) {
    if (!service || !widgetType) return false;
    const widgetInfo = SERVICES[service]?.widgets?.find((w) => w.id === widgetType);
    if (!widgetInfo || !widgetInfo.params) return true;
    return widgetInfo.params.every((param) => {
        // if optional (e.g. branch, or username), don't require it
        if (param.label.includes('optional') || param.label.includes('leave empty')) return true;
        return params[param.id]?.trim();
    });
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
            !areParamsComplete(service, widgetType, params) ||
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
                        SERVICES[service]?.widgets
                            ?.find((w) => w.id === widgetType)
                            ?.params?.map((param) => (
                                <div
                                    className="grid gap-2 animate-in fade-in slide-in-from-top-2"
                                    key={param.id}
                                >
                                    <WidgetParameterField
                                        param={param}
                                        value={params[param.id] || ''}
                                        onChange={(value) =>
                                            setParams({ ...params, [param.id]: value })
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
                            !areParamsComplete(service, widgetType, params) ||
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
