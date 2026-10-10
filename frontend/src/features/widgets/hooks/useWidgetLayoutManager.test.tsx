import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Layout } from 'react-grid-layout';
import { mockApi } from '@/test/fixtures';
import { useWidgetLayoutManager } from './useWidgetLayoutManager';

const stored = [
    {
        id: 1,
        serviceName: 'weather',
        widgetName: 'current_weather',
        params: {},
        refreshRate: 60,
        layout: { x: 0, y: 0, w: 3, h: 2 },
    },
    {
        id: 2,
        serviceName: 'crypto',
        widgetName: 'crypto_price',
        params: {},
        refreshRate: 60,
        layout: { x: 3, y: 0, w: 3, h: 2 },
    },
];
const grid = (moves: Record<string, Partial<{ x: number; y: number }>> = {}): Layout =>
    stored.map((w) => ({ i: String(w.id), ...w.layout, ...moves[String(w.id)] }));

function setup() {
    const fetchMock = mockApi({
        'GET /widgets': { body: stored },
        'PUT /widgets/layout': { status: 204 },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useWidgetLayoutManager(), {
        wrapper: ({ children }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
    });
    const puts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');
    const loaded = () => waitFor(() => expect(client.getQueryData(['widgets'])).toBeDefined());
    return { result, puts, loaded };
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('useWidgetLayoutManager', () => {
    it('does not overwrite the desktop layout with an automatic phone layout', async () => {
        const { result, puts, loaded } = setup();
        await loaded();
        const phone = grid().map((item, index) => ({ ...item, x: 0, y: index * 2, w: 2 }));

        act(() => result.current.onLayoutChange(phone, { lg: grid(), xxs: phone }));
        await act(() => vi.advanceTimersByTimeAsync(1000));

        expect(puts()).toHaveLength(0);
    });

    it('saves the desktop arrangement even if the active layout is for a phone', async () => {
        const { result, puts, loaded } = setup();
        await loaded();
        const desktop = grid({ 1: { x: 6 } });
        const phone = grid().map((item, index) => ({ ...item, x: 0, y: index * 2, w: 2 }));

        act(() => result.current.onLayoutChange(phone, { lg: desktop, xxs: phone }));
        await act(() => vi.advanceTimersByTimeAsync(500));

        expect(puts()).toHaveLength(1);
        expect(JSON.parse(String(puts()[0][1]?.body)).layouts[0].layout).toEqual({
            x: 6,
            y: 0,
            w: 3,
            h: 2,
        });
    });

    it('saves a moved widget once the user stops dragging', async () => {
        const { result, puts, loaded } = setup();
        await loaded();

        act(() => result.current.onLayoutChange(grid({ 1: { x: 6 } })));
        expect(puts()).toHaveLength(0);
        await act(() => vi.advanceTimersByTimeAsync(500));

        expect(puts()).toHaveLength(1);
        expect(JSON.parse(String(puts()[0][1]?.body)).layouts).toEqual([
            { id: 1, layout: { x: 6, y: 0, w: 3, h: 2 } },
            { id: 2, layout: { x: 3, y: 0, w: 3, h: 2 } },
        ]);
    });

    it('sends only the last layout of a quick series of moves', async () => {
        const { result, puts, loaded } = setup();
        await loaded();

        act(() => result.current.onLayoutChange(grid({ 1: { x: 6 } })));
        await act(() => vi.advanceTimersByTimeAsync(200));
        act(() => result.current.onLayoutChange(grid({ 1: { x: 9 } })));
        await act(() => vi.advanceTimersByTimeAsync(500));

        expect(puts()).toHaveLength(1);
        expect(JSON.parse(String(puts()[0][1]?.body)).layouts[0].layout.x).toBe(9);
    });

    it('does not save when the grid reports the stored layout (e.g. on mount)', async () => {
        const { result, puts, loaded } = setup();
        await loaded();

        act(() => result.current.onLayoutChange(grid()));
        await act(() => vi.advanceTimersByTimeAsync(1000));

        expect(puts()).toHaveLength(0);
    });

    it('saves a move back to the original position after an earlier save', async () => {
        const { result, puts, loaded } = setup();
        await loaded();

        act(() => result.current.onLayoutChange(grid({ 1: { x: 6 } })));
        await act(() => vi.advanceTimersByTimeAsync(500));
        await waitFor(() => expect(result.current.isSaving).toBe(false));
        act(() => result.current.onLayoutChange(grid()));
        await act(() => vi.advanceTimersByTimeAsync(500));

        expect(puts()).toHaveLength(2);
        expect(JSON.parse(String(puts()[1][1]?.body)).layouts[0].layout.x).toBe(0);
    });

    describe('keyboard changes', () => {
        const body = (puts: unknown[][]) =>
            JSON.parse(String((puts.at(-1)![1] as RequestInit).body)) as {
                layouts: { id: number; layout: Record<string, number> }[];
            };

        it('moves one column and saves at once', async () => {
            const { result, puts, loaded } = setup();
            await loaded();

            let layout;
            act(() => {
                layout = result.current.changeWidget(1, { dx: 1 });
            });

            expect(layout).toEqual({ x: 1, y: 0, w: 3, h: 2 });
            await waitFor(() => expect(puts()).toHaveLength(1));
            expect(body(puts()).layouts).toContainEqual({
                id: 1,
                layout: { x: 1, y: 0, w: 3, h: 2 },
            });
        });

        it('stays inside the twelve desktop columns and above the minimum size', async () => {
            const { result, puts, loaded } = setup();
            await loaded();

            let changes: unknown[] = [];
            act(() => {
                changes = [
                    result.current.changeWidget(1, { dx: -1 }), // already at column 1
                    result.current.changeWidget(1, { dw: 20 }),
                ];
            });

            expect(changes[0]).toBeNull();
            expect(changes[1]).toMatchObject({ x: 0, w: 12 });
            await waitFor(() => expect(puts()).toHaveLength(1));
        });

        it('jumps over the widget below, and does nothing without one', async () => {
            const { result, loaded } = setup();
            await loaded();

            let changes: unknown[] = [];
            act(() => {
                changes = [
                    result.current.changeWidget(1, { dy: 1 }), // nothing below in columns 1-3
                    result.current.changeWidget(1, { dw: 1 }), // now overlaps widget 2's columns
                ];
            });
            let down;
            act(() => {
                down = result.current.changeWidget(2, { dy: -1 });
            });

            expect(changes[0]).toBeNull();
            expect(down).toBeNull(); // both on row 1: nothing above widget 2
        });
    });
});
