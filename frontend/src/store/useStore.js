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
                    widgets: [...state.widgets, widget],
                })),
            updateWidget: (id, updates) =>
                set((state) => ({
                    widgets: state.widgets.map((widget) =>
                        widget.i === String(id) ? { ...widget, ...updates } : widget,
                    ),
                })),
            removeWidget: (id) =>
                set((state) => ({
                    widgets: state.widgets.filter((widget) => widget.i !== String(id)),
                })),
        }),
        {
            name: 'dashboard-storage',
            partialize: (state) => ({ theme: state.theme }), // Only persist theme locally
        },
    ),
);
