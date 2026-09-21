import { describe, expect, it } from 'vitest';
import { getDefaultWidgetLayout, toDashboardWidget, type ApiWidget } from './widgets';

describe('toDashboardWidget', () => {
    it('keeps the API widget contract while adding grid presentation fields', () => {
        const widget: ApiWidget = {
            id: 42,
            serviceName: 'weather',
            widgetName: 'current_weather',
            params: { city: 'Paris' },
            refreshRate: 60,
            layout: { x: 1, y: 2, w: 4, h: 3 },
        };

        expect(toDashboardWidget(widget, 'Weather - Current Temperature')).toEqual({
            ...widget,
            i: '42',
            x: 1,
            y: 2,
            w: 4,
            h: 3,
            title: 'Weather - Current Temperature',
        });
    });

    it('provides a readable title for a persisted weather widget', () => {
        const widget: ApiWidget = {
            id: 43,
            serviceName: 'weather',
            widgetName: 'forecast',
            params: { city: 'Paris' },
            refreshRate: 300,
            layout: { x: 0, y: 0, w: 4, h: 2 },
        };

        expect(toDashboardWidget(widget).title).toBe('Weather');
    });

    it('uses the short Weather title for current conditions', () => {
        const widget: ApiWidget = {
            id: 44,
            serviceName: 'weather',
            widgetName: 'current_weather',
            params: { city: 'Paris' },
            refreshRate: 60,
            layout: { x: 0, y: 0, w: 4, h: 2 },
        };

        expect(toDashboardWidget(widget).title).toBe('Weather');
    });

    it('normalizes legacy refresh rates to the 60-second minimum', () => {
        const widget: ApiWidget = {
            id: 45,
            serviceName: 'weather',
            widgetName: 'current_weather',
            params: { city: 'Paris' },
            refreshRate: 5,
            layout: { x: 0, y: 0, w: 3, h: 2 },
        };

        expect(toDashboardWidget(widget).refreshRate).toBe(60);
    });
});

describe('getDefaultWidgetLayout', () => {
    it('uses a narrower default for the current weather widget', () => {
        expect(getDefaultWidgetLayout('weather', 'current_weather')).toEqual({
            x: 0,
            y: 0,
            w: 3,
            h: 2,
        });
    });

    it('uses a taller default for the weather forecast', () => {
        expect(getDefaultWidgetLayout('weather', 'forecast')).toEqual({
            x: 0,
            y: 0,
            w: 4,
            h: 3,
        });
    });

    it('keeps the standard default for other widgets', () => {
        expect(getDefaultWidgetLayout('youtube', 'youtube-stats')).toEqual({
            x: 0,
            y: 0,
            w: 4,
            h: 2,
        });
    });
});
