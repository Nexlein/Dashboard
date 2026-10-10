import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateLayout, useWidgets } from './useWidgets';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import {
    toDashboardWidget,
    type DashboardWidget,
    type WidgetLayout,
} from '@/features/widgets/lib/widgets';

const SAVE_DELAY_MS = 500;
/** Columns of the desktop layout, the one stored by the API. */
export const DESKTOP_COLUMNS = 12;

export type LayoutChange = { dx?: number; dy?: number; dw?: number; dh?: number };

function toLayouts(layout: Layout) {
    return layout.map((item) => ({
        id: Number.parseInt(item.i, 10),
        layout: { x: item.x, y: item.y, w: item.w, h: item.h },
    }));
}

/** True when every grid item is already stored with the same position and size. */
function matchesStored(
    layouts: { id: number; layout: WidgetLayout }[],
    widgets: DashboardWidget[],
) {
    return layouts.every(({ id, layout }) => {
        const stored = widgets.find((widget) => widget.id === id)?.layout;
        return (
            stored !== undefined &&
            stored.x === layout.x &&
            stored.y === layout.y &&
            stored.w === layout.w &&
            stored.h === layout.h
        );
    });
}

/**
 * Saves the desktop layout once dragging or resizing pauses. Narrower layouts are
 * temporary adaptations and must never overwrite the single layout stored by the API.
 * The grid also reports layouts on mount and viewport changes; unchanged ones are ignored.
 */
export function useWidgetLayoutManager() {
    const { data: widgets } = useWidgets();
    const updateLayoutMutation = useUpdateLayout();
    const queryClient = useQueryClient();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onLayoutChange = (layout: Layout, responsiveLayouts?: ResponsiveLayouts) => {
        const desktopLayout = responsiveLayouts ? responsiveLayouts.lg : layout;
        if (!desktopLayout) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const layouts = toLayouts(desktopLayout);
        if (widgets && matchesStored(layouts, widgets)) return;

        timeoutRef.current = setTimeout(() => updateLayoutMutation.mutate(layouts), SAVE_DELAY_MS);
    };

    /**
     * Moves or resizes one widget from the keyboard, within the desktop grid, and saves at
     * once; returns null when nothing changes (e.g. already against the edge). The grid packs
     * widgets upwards, so moving up or down jumps over the neighbouring widget in the same
     * columns. The grid then packs the others around it, which onLayoutChange saves.
     */
    const changeWidget = (id: number, { dx = 0, dy = 0, dw = 0, dh = 0 }: LayoutChange) => {
        const widget = widgets?.find((item) => item.id === id);
        if (!widgets || !widget) return null;
        const w = Math.min(Math.max(widget.w + dw, widget.minW ?? 1), DESKTOP_COLUMNS);
        let y = widget.y;
        if (dy) {
            const sameColumns = widgets.filter(
                (other) =>
                    other.id !== id &&
                    other.x < widget.x + widget.w &&
                    widget.x < other.x + other.w,
            );
            const neighbour =
                dy > 0
                    ? sameColumns.filter((other) => other.y > widget.y).sort((a, b) => a.y - b.y)[0]
                    : sameColumns
                          .filter((other) => other.y < widget.y)
                          .sort((a, b) => b.y - a.y)[0];
            if (!neighbour) return null;
            y = dy > 0 ? neighbour.y + neighbour.h : neighbour.y;
        }
        const layout: WidgetLayout = {
            w,
            h: Math.max(widget.h + dh, widget.minH ?? 1),
            x: Math.min(Math.max(widget.x + dx, 0), DESKTOP_COLUMNS - w),
            y,
        };
        if (
            layout.x === widget.x &&
            layout.y === widget.y &&
            layout.w === widget.w &&
            layout.h === widget.h
        )
            return null;
        queryClient.setQueryData<DashboardWidget[]>(['widgets'], (current) =>
            current?.map((item) =>
                item.id === id ? toDashboardWidget({ ...item, layout }) : item,
            ),
        );
        updateLayoutMutation.mutate(
            widgets.map((item) => ({ id: item.id, layout: item.id === id ? layout : item.layout })),
        );
        return layout;
    };

    return {
        onLayoutChange,
        changeWidget,
        isSaving: updateLayoutMutation.isPending,
        error: updateLayoutMutation.error,
    };
}
