import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { updateWidget, MIN_REFRESH_RATE_SECONDS } from '@/lib/widgets';
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
} from '@/components/ui/dialog';
import { SERVICES } from './WidgetConfigurator'; // We'll need to export SERVICES from there
import { WidgetParameterField } from './WidgetParameterField';

function isRefreshRateValid(refreshTimer) {
    const refreshRate = Number(refreshTimer);
    return Number.isInteger(refreshRate) && refreshRate >= MIN_REFRESH_RATE_SECONDS;
}

export function WidgetEditDialog({ widget, open, onOpenChange }) {
    const updateWidgetInStore = useStore((state) => state.updateWidget);
    const [params, setParams] = useState({});
    const [refreshTimer, setRefreshTimer] = useState('60');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open && widget) {
            setParams(widget.params || {});
            setRefreshTimer(widget.refreshRate?.toString() || '60');
            setError('');
        }
    }, [open, widget]);

    if (!widget) return null;

    const service = widget.serviceName;
    const widgetType = widget.widgetName;
    const widgetInfo = SERVICES[service]?.widgets?.find((w) => w.id === widgetType);

    const handleSave = async () => {
        if (!isRefreshRateValid(refreshTimer)) return;
        setIsSaving(true);
        setError('');

        try {
            const updatedApiWidget = await updateWidget(parseInt(widget.i, 10), {
                params,
                refreshRate: parseInt(refreshTimer, 10),
            });

            // update local store
            updateWidgetInStore(widget.i, {
                params: updatedApiWidget.params,
                refreshRate: updatedApiWidget.refreshRate,
            });
            onOpenChange(false);
        } catch (err) {
            setError(err.message || 'Failed to update widget');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Widget</DialogTitle>
                    <DialogDescription>
                        Modify the settings for your {widgetInfo?.name || 'Widget'}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {widgetInfo?.params?.map((param) => (
                        <div key={param.id}>
                            <WidgetParameterField
                                param={param}
                                value={params[param.id] || ''}
                                onChange={(value) => setParams({ ...params, [param.id]: value })}
                            />
                        </div>
                    ))}

                    <div className="grid gap-2 mt-2">
                        <Label htmlFor="refreshTimer">Refresh Rate (seconds)</Label>
                        <Input
                            id="refreshTimer"
                            type="number"
                            min={MIN_REFRESH_RATE_SECONDS}
                            value={refreshTimer}
                            onChange={(e) => setRefreshTimer(e.target.value)}
                        />
                        <p className="text-[0.8rem] text-muted-foreground">
                            Minimum refresh rate is {MIN_REFRESH_RATE_SECONDS}s.
                        </p>
                    </div>

                    {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
