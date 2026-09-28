import { useState, useCallback, useEffect } from 'react';
import { useWidgetTimer } from '@/lib/useWidgetTimer';
import { Loader2 } from 'lucide-react';
import { fetchWidgetData, updateWidget as updateWidgetRequest } from '@/lib/widgets';
import { useStore } from '@/store/useStore';
import { REGISTRY } from '@/lib/registry';

export default function WidgetRenderer({ widget }) {
    const { id, serviceName, widgetName, refreshRate } = widget;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [periodUpdating, setPeriodUpdating] = useState(false);
    const updateWidgetInStore = useStore((state) => state.updateWidget);

    const serviceDef = REGISTRY[serviceName];
    const widgetDef = serviceDef?.widgets?.find((w) => w.id === widgetName);
    const Component = widgetDef?.component;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setData(await fetchWidgetData(id));
        } catch (err) {
            setError(err.message || 'Failed to fetch widget data');
        } finally {
            setLoading(false);
        }
    }, [id]);

    const handlePeriodChange = useCallback(
        async (days) => {
            if (String(widget.params?.days) === String(days)) return;

            setPeriodUpdating(true);
            setError(null);
            try {
                const updated = await updateWidgetRequest(id, {
                    params: { ...widget.params, days },
                });
                updateWidgetInStore(String(id), { params: updated.params });
            } catch (err) {
                setError(err.message || 'Failed to update widget param');
            } finally {
                setPeriodUpdating(false);
            }
        },
        [id, updateWidgetInStore, widget.params],
    );

    const isDataFetchingWidget = serviceDef?.hasRefresh !== false;
    useWidgetTimer(isDataFetchingWidget && serviceDef?.hasRefresh ? refreshRate : 0, fetchData);

    useEffect(() => {
        if (isDataFetchingWidget) fetchData();
    }, [widget.params, fetchData, isDataFetchingWidget]);

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
