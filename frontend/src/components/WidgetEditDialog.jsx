import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { updateWidget, MIN_REFRESH_RATE_SECONDS } from '@/lib/widgets';
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

    const serviceDef = REGISTRY[service];
    const widgetDef = serviceDef?.widgets?.find((w) => w.id === widgetType);

    const handleSave = async () => {
        if (!isRefreshRateValid(refreshTimer, serviceDef)) return;
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
