import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DashboardWidget } from '@/lib/widgets';

type Theme = 'light' | 'dark' | 'system';

interface StoreState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    widgets: DashboardWidget[];
    setWidgets: (widgets: DashboardWidget[]) => void;
    addWidget: (widget: DashboardWidget) => void;
    updateWidget: (id: string | number, updates: Partial<DashboardWidget>) => void;
    removeWidget: (id: string | number) => void;
}

export const useStore = create<StoreState>()(
    persist(
        (set) => ({
            theme: 'light',
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
