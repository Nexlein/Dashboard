import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';

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
            { id: 'weather-current', name: 'Current Temperature' },
            { id: 'weather-forecast', name: '5-Day Forecast' },
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

export function WidgetConfigurator() {
    const addWidget = useStore((state) => state.addWidget);
    const [open, setOpen] = useState(false);
    const [service, setService] = useState('');
    const [widgetType, setWidgetType] = useState('');
    const [params, setParams] = useState({});
    const [refreshTimer, setRefreshTimer] = useState('60'); // seconds

    const handleServiceChange = (val) => {
        setService(val);
        setWidgetType('');
        setParams({});
    };

    const handleSave = () => {
        if (!service || !widgetType) return;

        // Find the widget name for the title
        const widgetName =
            SERVICES[service].widgets.find((w) => w.id === widgetType)?.name || 'Unknown Widget';

        addWidget({
            service,
            type: widgetType,
            title: `${SERVICES[service].name} - ${widgetName}`,
            params,
            refreshTimer: parseInt(refreshTimer, 10),
        });

        setOpen(false);
        // Reset form
        setService('');
        setWidgetType('');
        setParams({});
        setRefreshTimer('60');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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

                    {service && (
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
                                min="10"
                                value={refreshTimer}
                                onChange={(e) => setRefreshTimer(e.target.value)}
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button disabled={!service || !widgetType} onClick={handleSave}>
                        Add to Dashboard
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
