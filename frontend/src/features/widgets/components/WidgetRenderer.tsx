import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { fetchWidgetData, type DashboardWidget } from '@/features/widgets/lib/widgets';
import { useUpdateWidget } from '@/features/widgets/hooks/useWidgets';
import { findWidgetDefinition, getServiceDefinition } from '@/features/widgets/lib/registry';

export default function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
    const { id, serviceName, widgetName, refreshRate } = widget;
    const updateWidgetMutation = useUpdateWidget();

    const serviceDef = getServiceDefinition(serviceName);
    const widgetDef = findWidgetDefinition(serviceName, widgetName);

    // Widgets without a refresh (the chatbot) render without loading any data.
    const isDataFetchingWidget = serviceDef?.hasRefresh ?? false;

    const {
        data,
        isLoading: loading,
        error: queryError,
    } = useQuery({
        queryKey: ['widget', id, widget.params],
        queryFn: () => fetchWidgetData(id),
        refetchInterval: isDataFetchingWidget ? refreshRate * 1000 : false,
        enabled: isDataFetchingWidget,
        retry: false,
    });

    const error = queryError?.message || null;

    const periodUpdating = updateWidgetMutation.isPending;

    const handlePeriodChange = useCallback(
        (days: string) => {
            if (String(widget.params?.days) === String(days)) return;
            updateWidgetMutation.mutate({ id, updates: { params: { ...widget.params, days } } });
        },
        [widget.params, updateWidgetMutation, id],
    );

    if (!serviceDef || !widgetDef) {
        return (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                This widget is not implemented yet.
            </div>
        );
    }

    const Component = widgetDef.component;
    const viewProps = {
        widget,
        selectedPeriod: widget.params?.days,
        onPeriodChange: handlePeriodChange,
        periodUpdating,
    };

    // The response shape depends on the widget; each catalog component declares its own
    // data type, so this is the one place where the untyped API response is handed over.
    if (!isDataFetchingWidget) return <Component {...viewProps} data={undefined as never} />;

    if (error) {
        const needsServiceConnection = error.includes('Configure it in Services');
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <p className="text-destructive text-sm font-medium">
                    Error loading {widgetDef.name}
                </p>
                <p className="text-muted-foreground text-xs mt-1">{error}</p>
                {needsServiceConnection && (
                    <a
                        href="/services"
                        className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                        Open Services
                    </a>
                )}
            </div>
        );
    }

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return <Component {...viewProps} data={data as never} />;
}
