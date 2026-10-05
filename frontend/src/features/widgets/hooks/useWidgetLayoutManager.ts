import { useRef } from 'react';
import { useUpdateLayout, useWidgets } from './useWidgets';
import type { Layout } from 'react-grid-layout';
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
 * Saves grid changes once dragging or resizing pauses. The grid also reports its layout
 * when it mounts; layouts identical to the stored ones are not sent.
 */
export function useWidgetLayoutManager() {
    const { data: widgets } = useWidgets();
    const updateLayoutMutation = useUpdateLayout();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onLayoutChange = (layout: Layout) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const layouts = toLayouts(layout);
        if (widgets && matchesStored(layouts, widgets)) return;

        timeoutRef.current = setTimeout(() => updateLayoutMutation.mutate(layouts), SAVE_DELAY_MS);
    };

    return {
        onLayoutChange,
        isSaving: updateLayoutMutation.isPending,
        error: updateLayoutMutation.error,
    };
}
