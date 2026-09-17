import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
    persist(
        (set) => ({
            theme: 'light', // default theme
            setTheme: (theme) => set({ theme }),
            widgets: [],
            setWidgets: (widgets) => set({ widgets }),
            addWidget: (widget) =>
                set((state) => ({
                    widgets: [
                        ...state.widgets,
                        {
                            ...widget,
                            i: String(widget.id), // Backend ID as grid ID
                            x: widget.layout?.x || 0,
                            y: widget.layout?.y || 0,
                            w: widget.layout?.w || 4,
                            h: widget.layout?.h || 2,
                        },
                    ],
                })),
        }),
        {
            name: 'dashboard-storage',
            partialize: (state) => ({ theme: state.theme }), // Only persist theme locally
        },
    ),
);
