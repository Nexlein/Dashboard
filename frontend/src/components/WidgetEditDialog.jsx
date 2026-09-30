import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { MIN_REFRESH_RATE_SECONDS } from '@/lib/widgets';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { REGISTRY } from '@/lib/registry';
import { WidgetForm } from './WidgetForm';

function isRefreshRateValid(refreshTimer, serviceDef) {
    if (serviceDef?.hasRefresh === false) return true;
    const refreshRate = Number(refreshTimer);
    return Number.isInteger(refreshRate) && refreshRate >= MIN_REFRESH_RATE_SECONDS;
}

export function WidgetEditDialog({ widget, open, onOpenChange }) {
    const updateWidgetAsync = useStore((state) => state.updateWidgetAsync);
    const [params, setParams] = useState(() => widget?.params || {});
    const [refreshTimer, setRefreshTimer] = useState(() => widget?.refreshRate?.toString() || '60');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [prevOpen, setPrevOpen] = useState(open);
    const [prevWidgetId, setPrevWidgetId] = useState(widget?.id);
    if (open !== prevOpen || widget?.id !== prevWidgetId) {
        setPrevOpen(open);
        setPrevWidgetId(widget?.id);
        if (open && widget) {
            setParams(widget.params || {});
            setRefreshTimer(widget.refreshRate?.toString() || '60');
            setError('');
        }
    }

    if (!widget) return null;

    const service = widget.serviceName;
    const widgetType = widget.widgetName;

    const serviceDef = REGISTRY[service];
    const widgetDef = serviceDef?.widgets?.find(
        (w) => w.id === widgetType || w.aliases?.includes(widgetType),
    );

    const handleSave = async () => {
        if (!isRefreshRateValid(refreshTimer, serviceDef)) return;
        setIsSaving(true);
        setError('');

        try {
            await updateWidgetAsync(widget.i, {
                params,
                refreshRate: parseInt(refreshTimer, 10),
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
                        Modify the settings for your {widgetDef?.name || 'Widget'}.
                    </DialogDescription>
                </DialogHeader>

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

                {error && (
                    <div className="grid gap-4">
                        <p className="text-sm font-medium text-destructive">{error}</p>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !isRefreshRateValid(refreshTimer, serviceDef)}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
