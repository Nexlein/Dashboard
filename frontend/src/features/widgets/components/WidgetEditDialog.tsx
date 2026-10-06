import { getErrorMessage } from '@/i18n/errors';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useUpdateWidget } from '@/features/widgets/hooks/useWidgets';
import {
    isRefreshRateValid,
    MIN_REFRESH_RATE_SECONDS,
    type DashboardWidget,
} from '@/features/widgets/lib/widgets';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { findWidgetDefinition, getServiceDefinition } from '@/features/widgets/lib/registry';
import { useWidgetCatalog } from '@/features/widgets/hooks/useWidgetCatalog';
import { findCatalogWidget } from '@/features/widgets/lib/catalog';
import { WidgetForm } from './WidgetForm';

// Mounted only while a widget is being edited (keyed by widget id), so the form
// state is seeded from the widget once instead of being synced in an effect.
export function WidgetEditDialog({
    widget,
    open,
    onOpenChange,
}: {
    widget: DashboardWidget;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    useTranslation();
    const updateWidgetMutation = useUpdateWidget();
    const [params, setParams] = useState(widget.params || {});
    const [refreshTimer, setRefreshTimer] = useState(widget.refreshRate?.toString() || '60');
    const [error, setError] = useState<unknown>('');

    const service = widget.serviceName;
    const widgetType = widget.widgetName;

    // The params the server declares (/about.json); the frontend definition until it loads.
    const catalog = useWidgetCatalog();
    const fromCatalog = findCatalogWidget(catalog.data, service, widgetType);
    const serviceDef = fromCatalog?.service ?? getServiceDefinition(service);
    const widgetDef = fromCatalog?.widget ?? findWidgetDefinition(service, widgetType);

    const handleSave = async () => {
        if (!isRefreshRateValid(refreshTimer, serviceDef, widgetDef)) return;
        setError('');

        try {
            await updateWidgetMutation.mutateAsync({
                id: widget.id,
                updates: {
                    params,
                    refreshRate:
                        (widgetDef?.hasRefresh ?? serviceDef?.hasRefresh) === false
                            ? MIN_REFRESH_RATE_SECONDS
                            : Number(refreshTimer),
                },
            });
            onOpenChange(false);
        } catch (err) {
            setError(err);
        }
    };

    const isSaving = updateWidgetMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>{i18n.t('widgets:editTitle')}</DialogTitle>
                    <DialogDescription>
                        {i18n.t('widgets:editSubtitle', {
                            name: widgetDef?.name || widget.widgetName,
                        })}
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

                {Boolean(error) && (
                    <div className="grid gap-4">
                        <p className="text-sm font-medium text-destructive">
                            {getErrorMessage(error)}
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        {i18n.t('common:cancel')}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={
                            isSaving || !isRefreshRateValid(refreshTimer, serviceDef, widgetDef)
                        }
                    >
                        {isSaving ? i18n.t('common:saving') : i18n.t('common:saveChanges')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
