import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    fetchWidgets,
    deleteWidget as apiDeleteWidget,
    updateWidget as apiUpdateWidget,
    createWidget as apiCreateWidget,
    toDashboardWidget,
} from '@/lib/widgets';

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

            fetchWidgetsAsync: async () => {
                const apiWidgets = await fetchWidgets();
                set({ widgets: apiWidgets.map((w) => toDashboardWidget(w)) });
            },

            deleteWidgetAsync: async (id) => {
                await apiDeleteWidget(Number.parseInt(id, 10));
                set((state) => ({
                    widgets: state.widgets.filter((widget) => widget.i !== String(id)),
                }));
            },

            updateWidgetAsync: async (id, payload) => {
                const updatedApiWidget = await apiUpdateWidget(Number.parseInt(id, 10), payload);
                const dashboardWidget = toDashboardWidget(updatedApiWidget);
                set((state) => ({
                    widgets: state.widgets.map((widget) =>
                        widget.i === String(id)
                            ? {
                                  ...widget,
                                  params: dashboardWidget.params,
                                  refreshRate: dashboardWidget.refreshRate,
                                  title: dashboardWidget.title,
                              }
                            : widget,
                    ),
                }));
            },

            createWidgetAsync: async (payload) => {
                const apiWidget = await apiCreateWidget(payload);
                set((state) => ({
                    widgets: [...state.widgets, toDashboardWidget(apiWidget)],
                }));
            },
        }),
        {
            name: 'dashboard-storage',
            partialize: (state) => ({ theme: state.theme }), // Only persist theme locally
        },
    ),
);
