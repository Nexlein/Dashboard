import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchUserWidgets,
    addWidgetConfig,
    updateWidgetConfig,
    updateWidgetsLayout,
    removeWidgetConfig,
    toDashboardWidget,
    type CreateWidgetPayload,
    type DashboardWidget,
    type UpdateWidgetPayload,
    type WidgetLayout,
} from '../lib/widgets';

export function useWidgets() {
    return useQuery({
        queryKey: ['widgets'],
        queryFn: fetchUserWidgets,
    });
}

export function useAddWidget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateWidgetPayload) => addWidgetConfig(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['widgets'] }),
    });
}

export function useUpdateWidget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: number; updates: UpdateWidgetPayload }) =>
            updateWidgetConfig(id, updates),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['widgets'] }),
    });
}

export function useUpdateLayout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (layouts: { id: number; layout: WidgetLayout }[]) =>
            updateWidgetsLayout(layouts),
        // Keep the cached widgets in line with what the server now stores, without a refetch.
        onSuccess: (_result, layouts) =>
            queryClient.setQueryData<DashboardWidget[]>(['widgets'], (widgets) =>
                widgets?.map((widget) => {
                    const saved = layouts.find((item) => item.id === widget.id);
                    return saved ? toDashboardWidget({ ...widget, layout: saved.layout }) : widget;
                }),
            ),
    });
}

export function useRemoveWidget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => removeWidgetConfig(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['widgets'] }),
    });
}
