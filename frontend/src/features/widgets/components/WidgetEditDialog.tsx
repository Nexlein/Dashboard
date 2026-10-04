import { useState, useEffect } from 'react';
import { useUpdateWidget } from '@/features/widgets/hooks/useWidgets';
import { MIN_REFRESH_RATE_SECONDS } from '@/features/widgets/lib/widgets';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { REGISTRY } from '@/features/widgets/lib/registry';
import { WidgetForm } from './WidgetForm';

function isRefreshRateValid(refreshTimer: string, serviceDef: any) {
    if (serviceDef?.hasRefresh === false) return true;
    const refreshRate = Number(refreshTimer);
    return Number.isInteger(refreshRate) && refreshRate >= MIN_REFRESH_RATE_SECONDS;
}

export function WidgetEditDialog({ widget, open, onOpenChange }: any) {
    const updateWidgetMutation = useUpdateWidget();
    const [params, setParams] = useState({});
    const [refreshTimer, setRefreshTimer] = useState('60');
    const [error, setError] = useState('');

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
    const widgetDef = serviceDef?.widgets?.find(
        (w: any) => w.id === widgetType || w.aliases?.includes(widgetType),
    );

    const handleSave = async () => {
        if (!isRefreshRateValid(refreshTimer, serviceDef)) return;
        setError('');

        try {
            await updateWidgetMutation.mutateAsync({
                id: widget.id,
                updates: {
                    params,
                    refreshRate: parseInt(refreshTimer, 10),
                },
            });
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message || 'Failed to update widget');
        }
    };

    const isSaving = updateWidgetMutation.isPending;

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
