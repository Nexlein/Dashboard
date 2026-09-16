import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
    persist(
        (set) => ({
            theme: 'dark', // default theme
            setTheme: (theme) => set({ theme }),
            widgets: [
                // initial dummy layout for #55
                { i: 'a', x: 0, y: 0, w: 4, h: 2, title: 'Weather' },
                { i: 'b', x: 4, y: 0, w: 4, h: 2, title: 'GitHub' },
            ],
            setWidgets: (widgets) => set({ widgets }),
            addWidget: (widget) =>
                set((state) => ({
                    widgets: [
                        ...state.widgets,
                        {
                            ...widget,
                            i: crypto.randomUUID(), // unique id
                            x: 0,
                            y: 0, // Top left placement, gravity handles the rest
                            w: widget.w || 4,
                            h: widget.h || 2,
                        },
                    ],
                })),
        }),
        {
            name: 'dashboard-storage',
        },
    ),
);
