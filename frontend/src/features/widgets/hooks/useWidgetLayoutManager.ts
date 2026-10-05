import { useRef } from 'react';
import { useUpdateLayout } from './useWidgets';
import type { Layout } from 'react-grid-layout';

export function useWidgetLayoutManager() {
    const updateLayoutMutation = useUpdateLayout();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onLayoutChange = (layout: Layout) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            const formatted = layout.map((l) => ({
                id: parseInt(l.i, 10),
                layout: { x: l.x, y: l.y, w: l.w, h: l.h },
            }));
            updateLayoutMutation.mutate(formatted);
        }, 500);
    };

    return {
        onLayoutChange,
        isSaving: updateLayoutMutation.isPending,
        error: updateLayoutMutation.error,
    };
}
