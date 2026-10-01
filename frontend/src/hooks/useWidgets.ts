import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchUserWidgets,
    addWidgetConfig,
    updateWidgetConfig,
    updateWidgetsLayout,
    removeWidgetConfig,
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
        mutationFn: (payload: any) => addWidgetConfig(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['widgets'] }),
    });
}

export function useUpdateWidget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string | number; updates: any }) =>
            updateWidgetConfig(id, updates),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['widgets'] }),
    });
}

export function useUpdateLayout() {
    return useMutation({
        mutationFn: (layouts: { id: number; layout: any }[]) => updateWidgetsLayout(layouts),
    });
}

export function useRemoveWidget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string | number) => removeWidgetConfig(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['widgets'] }),
    });
}
