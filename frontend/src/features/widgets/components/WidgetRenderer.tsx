import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/apiClient';
import { Loader2 } from 'lucide-react';
import {
    fetchWidgetData,
    widgetQueryKey,
    type DashboardWidget,
} from '@/features/widgets/lib/widgets';
import { useUpdateWidget } from '@/features/widgets/hooks/useWidgets';
import { findWidgetDefinition, getServiceDefinition } from '@/features/widgets/lib/registry';

export default function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
    const { id, serviceName, widgetName, refreshRate } = widget;
    const updateWidgetMutation = useUpdateWidget();
    const queryClient = useQueryClient();

    const serviceDef = getServiceDefinition(serviceName);
    const widgetDef = findWidgetDefinition(serviceName, widgetName);

    // Widgets without a refresh (the chatbot) render without loading any data.
    const isDataFetchingWidget = widgetDef?.hasRefresh ?? serviceDef?.hasRefresh ?? false;

    const periodParam = serviceDef?.periodParam ?? 'days';
    const quotaLimited = serviceDef?.quotaLimited ?? false;
    // Same widget settings apart from the period: an earlier chart can stand in meanwhile.
    const withoutPeriod = (params: DashboardWidget['params'] | undefined) =>
        JSON.stringify({ ...params, [periodParam]: undefined });

    const {
        data,
        error: queryError,
        isFetching,
        isPlaceholderData,
    } = useQuery({
        queryKey: widgetQueryKey(id, widget.params),
        queryFn: () => fetchWidgetData(id),
        refetchInterval: (query) => {
            const error = query.state.error;
            if (quotaLimited && error instanceof ApiError && error.retryAfter) {
                return Math.max(1000, error.retryAfter * 1000);
            }
            return isDataFetchingWidget ? refreshRate * 1000 : false;
        },
        staleTime: quotaLimited ? refreshRate * 1000 : 0,
        refetchOnWindowFocus: !quotaLimited,
        placeholderData: quotaLimited
            ? (previous, query) =>
                  withoutPeriod(query?.queryKey[2] as DashboardWidget['params']) ===
                  withoutPeriod(widget.params)
                      ? previous
                      : undefined
            : undefined,
        enabled: isDataFetchingWidget,
        retry: false,
    });

    const error = queryError?.message || null;
    const retryAfter =
        quotaLimited && queryError instanceof ApiError ? queryError.retryAfter : undefined;
    const savedData = quotaLimited
        ? queryClient
              .getQueryCache()
              .findAll({ queryKey: widgetQueryKey(id) })
              .filter(
                  (query) =>
                      withoutPeriod(query.queryKey[2] as DashboardWidget['params']) ===
                          withoutPeriod(widget.params) && query.state.data,
              )
              .sort((left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt)[0]?.state
              .data
        : undefined;
    const displayData = data ?? savedData;
    const pendingPeriod = quotaLimited && (isPlaceholderData || (!!queryError && !!displayData));

    const periodUpdating = updateWidgetMutation.isPending || (quotaLimited && isFetching);

    const handlePeriodChange = useCallback(
        (period: string) => {
            if (String(widget.params?.[periodParam]) === String(period)) return;
            updateWidgetMutation.mutate({
                id,
                updates: { params: { ...widget.params, [periodParam]: period } },
            });
        },
        [widget.params, updateWidgetMutation, id, periodParam],
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
        selectedPeriod: widget.params?.[periodParam],
        onPeriodChange: handlePeriodChange,
        periodUpdating,
    };

    // The response shape depends on the widget; each catalog component declares its own
    // data type, so this is the one place where the untyped API response is handed over.
    if (!isDataFetchingWidget) return <Component {...viewProps} data={undefined as never} />;

    if (retryAfter && !displayData) {
        return (
            <div
                className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center"
                role="status"
            >
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <p className="text-sm font-medium">Loading data progressively</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <p className="text-xs text-muted-foreground">
                    Automatic retry in {retryAfter} seconds.
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
            {queryError && displayData && !quotaLimited && (
                <p role="alert" className="shrink-0 text-xs text-destructive">
                    Refresh unavailable: {error}. Showing previously loaded data.
                </p>
            )}
            {pendingPeriod && (
                <p
                    className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                    role="status"
                >
                    {retryAfter
                        ? `Waiting for API credits. Automatic retry in ${retryAfter} seconds.`
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
