import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/apiClient';
import { Loader2 } from 'lucide-react';
import { fetchWidgetData, type DashboardWidget } from '@/features/widgets/lib/widgets';
import { useUpdateWidget } from '@/features/widgets/hooks/useWidgets';
import { findWidgetDefinition, getServiceDefinition } from '@/features/widgets/lib/registry';

export default function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
    const { id, serviceName, widgetName, refreshRate } = widget;
    const updateWidgetMutation = useUpdateWidget();
    const queryClient = useQueryClient();

    const serviceDef = getServiceDefinition(serviceName);
    const widgetDef = findWidgetDefinition(serviceName, widgetName);

    // Widgets without a refresh (the chatbot) render without loading any data.
    const isDataFetchingWidget = serviceDef?.hasRefresh ?? false;

    const {
        data,
        error: queryError,
        isFetching,
        isPlaceholderData,
    } = useQuery({
        queryKey: ['widget', id, widget.params],
        queryFn: () => fetchWidgetData(id),
        refetchInterval: (query) => {
            const error = query.state.error;
            if (serviceName === 'stocks' && error instanceof ApiError && error.retryAfter) {
                return Math.max(1000, error.retryAfter * 1000);
            }
            return isDataFetchingWidget ? refreshRate * 1000 : false;
        },
        staleTime: serviceName === 'stocks' ? refreshRate * 1000 : 0,
        refetchOnWindowFocus: serviceName !== 'stocks',
        placeholderData:
            serviceName === 'stocks'
                ? (previous, query) =>
                      (query?.queryKey[2] as DashboardWidget['params'])?.symbols ===
                      widget.params.symbols
                          ? previous
                          : undefined
                : undefined,
        enabled: isDataFetchingWidget,
        retry: false,
    });

    const error = queryError?.message || null;
    const waitingForCredits =
        serviceName === 'stocks' && queryError instanceof ApiError && !!queryError.retryAfter;
    const savedStockData =
        serviceName === 'stocks'
            ? queryClient
                  .getQueryCache()
                  .findAll({ queryKey: ['widget', id] })
                  .filter(
                      (query) =>
                          (query.queryKey[2] as DashboardWidget['params'])?.symbols ===
                              widget.params.symbols && query.state.data,
                  )
                  .sort((left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt)[0]
                  ?.state.data
            : undefined;
    const displayData = data ?? savedStockData;
    const pendingPeriod =
        serviceName === 'stocks' && (isPlaceholderData || (!!queryError && !!displayData));

    const periodUpdating =
        updateWidgetMutation.isPending || (serviceName === 'stocks' && isFetching);

    const handlePeriodChange = useCallback(
        (period: string) => {
            const periodKey = serviceName === 'stocks' ? 'period' : 'days';
            if (String(widget.params?.[periodKey]) === String(period)) return;
            updateWidgetMutation.mutate({
                id,
                updates: { params: { ...widget.params, [periodKey]: period } },
            });
        },
        [widget.params, updateWidgetMutation, id, serviceName],
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
        selectedPeriod: serviceName === 'stocks' ? widget.params?.period : widget.params?.days,
        onPeriodChange: handlePeriodChange,
        periodUpdating,
    };

    // The response shape depends on the widget; each catalog component declares its own
    // data type, so this is the one place where the untyped API response is handed over.
    if (!isDataFetchingWidget) return <Component {...viewProps} data={undefined as never} />;

    if (waitingForCredits && !displayData) {
        return (
            <div
                className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center"
                role="status"
            >
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <p className="text-sm font-medium">Loading stock data progressively</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <p className="text-xs text-muted-foreground">
                    Automatic retry in {queryError.retryAfter} seconds.
                </p>
            </div>
        );
    }

    if (error && !displayData) {
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

    if (!displayData) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 w-full flex-col gap-2">
            {pendingPeriod && (
                <p
                    className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                    role="status"
                >
                    {waitingForCredits
                        ? `Waiting for API credits. Automatic retry in ${queryError.retryAfter} seconds.`
                        : queryError
                          ? `Refresh unavailable: ${error}`
                          : 'Loading the requested period…'}{' '}
                    Showing previously loaded data (
                    {String((displayData as { period?: string }).period ?? '')}).
                </p>
            )}
            <div className="min-h-0 flex-1">
                <Component {...viewProps} data={displayData as never} />
            </div>
        </div>
    );
}
