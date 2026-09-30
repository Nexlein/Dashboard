import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { fetchWidgetData, updateWidget as updateWidgetRequest } from '@/lib/widgets';
import { useStore } from '@/store/useStore';
import { REGISTRY } from '@/lib/registry';

export default function WidgetRenderer({ widget }) {
    const { id, serviceName, widgetName, refreshRate } = widget;
    const updateWidgetInStore = useStore((state) => state.updateWidget);

    const serviceDef = REGISTRY[serviceName];
    const widgetDef = serviceDef?.widgets?.find(
        (w) => w.id === widgetName || w.aliases?.includes(widgetName),
    );
    const Component = widgetDef?.component;

    const isDataFetchingWidget = serviceDef ? serviceDef.hasRefresh !== false : false;

    const {
        data,
        isLoading: loading,
        error: queryError,
    } = useQuery({
        queryKey: ['widget', id, widget.params],
        queryFn: () => fetchWidgetData(id),
        refetchInterval:
            isDataFetchingWidget && serviceDef?.hasRefresh ? refreshRate * 1000 : false,
        enabled: isDataFetchingWidget,
        retry: false,
    });

    const error = queryError?.message || null;

    const periodMutation = useMutation({
        mutationFn: (days) => updateWidgetRequest(id, { params: { ...widget.params, days } }),
        onSuccess: (updated) => {
            updateWidgetInStore(String(id), { params: updated.params });
        },
    });

    const periodUpdating = periodMutation.isPending;

    const handlePeriodChange = useCallback(
        (days) => {
            if (String(widget.params?.days) === String(days)) return;
            periodMutation.mutate(days);
        },
        [widget.params, periodMutation],
    );

    if (!serviceDef || !widgetDef) {
        return (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                This widget is not implemented yet.
            </div>
        );
    }

    // Static widgets (e.g. Chatbot) don't fetch data through WidgetRenderer
    if (!isDataFetchingWidget) {
        return <Component widget={widget} />;
    }

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

    if (!Component) {
        return (
            <pre className="h-full w-full overflow-auto text-xs">
                {JSON.stringify(data, null, 2)}
            </pre>
        );
    }

    return (
        <Component
            data={data}
            widget={widget}
            selectedPeriod={widget.params?.days}
            onPeriodChange={handlePeriodChange}
            periodUpdating={periodUpdating}
        />
    );
}
