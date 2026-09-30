import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getDefaultWidgetLayout,
    toDashboardWidget,
    fetchWidgets,
    fetchWidgetData,
    createWidget,
    updateWidgetLayouts,
    updateWidget,
    deleteWidget,
} from './widgets';
import { API_URL } from './auth';

describe('widgets lib', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(() => 'fake-token'),
        });
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('getDefaultWidgetLayout returns default layout', () => {
        const layout = getDefaultWidgetLayout('unknown', 'widget');
        expect(layout).toEqual({ x: 0, y: 0, w: 4, h: 2 });
    });

    it('toDashboardWidget formats widget correctly', () => {
        const dashboardWidget = toDashboardWidget({
            id: 1,
            serviceName: 'weather',
            widgetName: 'current',
            params: {},
            refreshRate: 30,
            layout: { x: 1, y: 1, w: 2, h: 2 },
        });

        expect(dashboardWidget.i).toBe('1');
        expect(dashboardWidget.refreshRate).toBe(60); // Math.max 60
    });

    it('fetchWidgets calls API', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => [{ id: 1 }],
        } as any);

        const widgets = await fetchWidgets();
        expect(fetch).toHaveBeenCalledWith(`${API_URL}/widgets`, expect.any(Object));
        expect(widgets).toEqual([{ id: 1 }]);
    });

    it('fetchWidgetData calls API', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: 'ok' }),
        } as any);

        const data = await fetchWidgetData(1);
        expect(fetch).toHaveBeenCalledWith(`${API_URL}/widgets/1/data`, expect.any(Object));
        expect(data).toEqual({ data: 'ok' });
    });

    it('createWidget calls API', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 2 }),
        } as any);

        const widget = await createWidget({} as any);
        expect(fetch).toHaveBeenCalledWith(
            `${API_URL}/widgets`,
            expect.objectContaining({ method: 'POST' }),
        );
        expect(widget).toEqual({ id: 2 });
    });

    it('updateWidgetLayouts calls API', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
        } as any);

        await updateWidgetLayouts([{ id: 1, layout: { x: 0, y: 0, w: 2, h: 2 } }]);
        expect(fetch).toHaveBeenCalledWith(
            `${API_URL}/widgets/layout`,
            expect.objectContaining({ method: 'PUT' }),
        );
    });

    it('updateWidget calls API', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 1, updated: true }),
        } as any);

        const widget = await updateWidget(1, { refreshRate: 120 });
        expect(fetch).toHaveBeenCalledWith(
            `${API_URL}/widgets/1`,
            expect.objectContaining({ method: 'PUT' }),
        );
        expect(widget).toEqual({ id: 1, updated: true });
    });

    it('deleteWidget calls API', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
        } as any);

        await deleteWidget(1);
        expect(fetch).toHaveBeenCalledWith(
            `${API_URL}/widgets/1`,
            expect.objectContaining({ method: 'DELETE' }),
        );
    });
});
