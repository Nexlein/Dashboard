import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { preload } from 'react-dom';
import { makeWidget, mockApi } from '@/test/fixtures';
import { REGISTRY } from '../lib/registry';
import { useWidgets, useUpdateLayout } from './useWidgets';
import type { DashboardWidget } from '../lib/widgets';

vi.mock('react-dom', async (original) => ({
    ...(await original<typeof import('react-dom')>()),
    preload: vi.fn(),
}));

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
const video = (id: number, x: number, y: number, url = 'https://youtu.be/M7lc1UVf-VE') =>
    makeWidget({
        id,
        serviceName: 'youtube',
        widgetName: 'video_player',
        params: { video_url: url },
        layout: { x, y, w: 4, h: 4 },
    });

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(preload).mockClear();
});
afterEach(() => {
    client.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('dashboard widget loading', () => {
    it('prioritizes the first video by row then column and loads selected chunks concurrently', async () => {
        let release!: () => void;
        const pending = new Promise<void>((resolve) => {
            release = resolve;
        });
        const videoLoad = vi
            .spyOn(REGISTRY.youtube.widgets[0].component, 'preload')
            .mockReturnValue(pending);
        const chatLoad = vi
            .spyOn(REGISTRY.chatbot.widgets[0].component, 'preload')
            .mockReturnValue(pending);
        const unusedLoad = vi.spyOn(REGISTRY.weather.widgets[0].component, 'preload');
        const widgets = [
            video(1, 0, 4),
            video(2, 6, 0),
            makeWidget({ id: 3, serviceName: 'chatbot', widgetName: 'ai_chat' }),
            video(4, 0, 0, 'https://youtu.be/dQw4w9WgXcQ'),
        ];
        const fetch = mockApi({ 'GET /widgets': { body: widgets } });
        const { result } = renderHook(() => useWidgets(), { wrapper });
        try {
            await waitFor(() => {
                expect(videoLoad).toHaveBeenCalledTimes(3);
                expect(chatLoad).toHaveBeenCalledOnce();
            });
            expect(result.current.isPending).toBe(true);
            expect(unusedLoad).not.toHaveBeenCalled();
            expect(preload).toHaveBeenCalledExactlyOnceWith(
                'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                { as: 'image', fetchPriority: 'high' },
            );
            release();
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data?.map((widget) => widget.id)).toEqual([1, 2, 3, 4]);
            expect(fetch).toHaveBeenCalledOnce();
        } finally {
            release();
        }
    });

    it.each([
        { name: 'an empty dashboard', widgets: [] },
        {
            name: 'an unknown widget',
            widgets: [makeWidget({ serviceName: 'unknown', widgetName: 'missing' })],
        },
        { name: 'an invalid video URL', widgets: [video(1, 0, 0, 'https://example.com/private')] },
    ])('does not request a thumbnail for $name', async ({ widgets }) => {
        const videoLoad = vi
            .spyOn(REGISTRY.youtube.widgets[0].component, 'preload')
            .mockResolvedValue(undefined);
        mockApi({ 'GET /widgets': { body: widgets } });
        const { result } = renderHook(() => useWidgets(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(widgets.length);
        expect(preload).not.toHaveBeenCalled();
        expect(videoLoad).toHaveBeenCalledTimes(widgets[0]?.serviceName === 'youtube' ? 1 : 0);
    });

    it('keeps widget metadata available when a chunk cannot be preloaded', async () => {
        vi.spyOn(REGISTRY.youtube.widgets[0].component, 'preload').mockRejectedValue(
            new Error('Chunk unavailable'),
        );
        mockApi({ 'GET /widgets': { body: [video(1, 0, 0)] } });
        const { result } = renderHook(() => useWidgets(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.[0]).toMatchObject({
            id: 1,
            serviceName: 'youtube',
            widgetName: 'video_player',
        });
    });

    it('preserves an authentication error without starting any widget preload', async () => {
        const load = vi.spyOn(REGISTRY.youtube.widgets[0].component, 'preload');
        mockApi({
            'GET /widgets': {
                status: 401,
                body: { error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' },
            },
        });
        const { result } = renderHook(() => useWidgets(), { wrapper });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toMatchObject({
            status: 401,
            code: 'AUTHENTICATION_REQUIRED',
        });
        expect(result.current.data).toBeUndefined();
        expect(load).not.toHaveBeenCalled();
        expect(preload).not.toHaveBeenCalled();
    });
});

describe('saved dashboard layout', () => {
    it('updates cached coordinates after saving without refetching or changing other widgets', async () => {
        const widgets = [video(1, 0, 0), makeWidget({ id: 2 })];
        client.setQueryData(['widgets'], widgets);
        const fetch = mockApi({ 'PUT /widgets/layout': { status: 204 } });
        const { result } = renderHook(() => useUpdateLayout(), { wrapper });
        const layout = { x: 6, y: 5, w: 5, h: 4 };
        await act(async () => {
            await result.current.mutateAsync([{ id: 1, layout }]);
        });
        const saved = client.getQueryData<DashboardWidget[]>(['widgets'])!;
        expect(saved[0]).toMatchObject({ ...layout, layout, params: widgets[0].params, i: '1' });
        expect(saved[1]).toBe(widgets[1]);
        expect(fetch).toHaveBeenCalledOnce();
        expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({
            layouts: [{ id: 1, layout }],
        });
    });

    it('keeps the cached layout intact when the save fails', async () => {
        const widgets = [video(1, 0, 0)];
        client.setQueryData(['widgets'], widgets);
        mockApi({ 'PUT /widgets/layout': { status: 503, body: { error: 'Service unavailable' } } });
        const { result } = renderHook(() => useUpdateLayout(), { wrapper });
        await act(async () => {
            await expect(
                result.current.mutateAsync([{ id: 1, layout: { x: 6, y: 5, w: 5, h: 4 } }]),
            ).rejects.toMatchObject({ status: 503 });
        });
        expect(client.getQueryData(['widgets'])).toBe(widgets);
    });
});
