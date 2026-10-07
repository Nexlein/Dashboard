import { useRef } from 'react';
import { useUpdateLayout, useWidgets } from './useWidgets';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import type { DashboardWidget, WidgetLayout } from '@/features/widgets/lib/widgets';

const SAVE_DELAY_MS = 500;

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
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onLayoutChange = (layout: Layout, responsiveLayouts?: ResponsiveLayouts) => {
        const desktopLayout = responsiveLayouts ? responsiveLayouts.lg : layout;
        if (!desktopLayout) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const layouts = toLayouts(desktopLayout);
        if (widgets && matchesStored(layouts, widgets)) return;

        timeoutRef.current = setTimeout(() => updateLayoutMutation.mutate(layouts), SAVE_DELAY_MS);
    };

    return {
        onLayoutChange,
        isSaving: updateLayoutMutation.isPending,
        error: updateLayoutMutation.error,
    };
}
