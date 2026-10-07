import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { preload } from 'react-dom';
import { findWidgetDefinition } from '../lib/registry';
import { youtubeThumbnailUrl } from '../lib/youtube';
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
        queryFn: async () => {
            const widgets = await fetchUserWidgets();
            // Give the first video preview a head start over grid/component rendering.
            const firstVideo = widgets
                .filter(
                    (widget) =>
                        widget.serviceName === 'youtube' && widget.widgetName === 'video_player',
                )
                .sort((left, right) => left.y - right.y || left.x - right.x)[0];
            const thumbnail = firstVideo && youtubeThumbnailUrl(firstVideo.params.video_url);
            if (thumbnail) preload(thumbnail, { as: 'image', fetchPriority: 'high' });
            // Load the selected chunks concurrently, before mounting their Suspense fallbacks.
            await Promise.all(
                widgets.map((widget) =>
                    findWidgetDefinition(widget.serviceName, widget.widgetName)
                        ?.component.preload?.()
                        .catch(() => {}),
                ),
            );
            return widgets;
        },
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
