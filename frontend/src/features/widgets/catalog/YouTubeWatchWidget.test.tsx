import { beforeEach, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/test-utils';
import { makeWidget, mockApi } from '@/test/fixtures';
import WidgetRenderer from '@/features/widgets/components/WidgetRenderer';
import type { YouTubeWatchData } from './YouTubeWatchWidget';

const widget = makeWidget({
    id: 9,
    serviceName: 'youtube',
    widgetName: 'channel_watch',
    params: { channels: '@alpha\n@beta' },
});
const data: YouTubeWatchData = {
    channels: [
        { id: 'a', title: 'Alpha', checkedAt: '2026-10-06T12:00:00Z' },
        { id: 'b', title: 'Beta', checkedAt: '2026-10-06T12:00:00Z' },
    ],
    videos: [
        {
            id: 'M7lc1UVf-VE',
            title: 'Alpha news',
            channelId: 'a',
            channelTitle: 'Alpha',
            publishedAt: '2026-10-06T10:00:00Z',
            url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
            thumbnail: 'https://i.ytimg.com/vi/M7lc1UVf-VE/mqdefault.jpg',
        },
        {
            id: 'dQw4w9WgXcQ',
            title: 'Beta news',
            channelId: 'b',
            channelTitle: 'Beta',
            publishedAt: '2026-10-05T10:00:00Z',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        },
    ],
    warnings: [],
};
beforeEach(() => localStorage.clear());

it('fetches the watch feed while keeping the video player free of data requests', async () => {
    const fetch = mockApi({ 'GET /widgets/9/data': { body: data } });
    render(<WidgetRenderer widget={widget} />);
    expect(await screen.findByText('Alpha news')).toBeInTheDocument();
    expect(screen.getByText('Beta news')).toBeInTheDocument();
    expect(screen.getAllByText('New')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Alpha news/ })).toHaveAttribute(
        'href',
        data.videos[0].url,
    );
    expect(screen.queryByTitle('YouTube video player')).toBeNull();
    expect(fetch).toHaveBeenCalledOnce();
});

it('filters channels, marks only visible items as seen and remembers them after remount', async () => {
    mockApi({ 'GET /widgets/9/data': { body: data } });
    const view = render(<WidgetRenderer widget={widget} />);
    await screen.findByText('Alpha news');
    fireEvent.click(screen.getByRole('button', { name: /^Beta$/ }));
    expect(screen.queryByText('Alpha news')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mark visible publications as seen' }));
    expect(screen.queryByText('New')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'All channels' }));
    expect(screen.getAllByText('New')).toHaveLength(1);
    fireEvent.click(screen.getByRole('link', { name: /Alpha news/ }));
    expect(screen.queryByText('New')).toBeNull();
    view.unmount();
    render(<WidgetRenderer widget={widget} />);
    await screen.findByText('Alpha news');
    expect(screen.queryByText('New')).toBeNull();
});

it('requests a manual refresh and preserves existing cards if it fails', async () => {
    const fetch = mockApi({ 'GET /widgets/9/data': { body: data } });
    render(<WidgetRenderer widget={widget} />);
    await screen.findByText('Alpha news');
    fetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Feed unavailable' }), { status: 503 }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh publications' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Feed unavailable');
    expect(screen.getByText('Alpha news')).toBeInTheDocument();
    expect(String(fetch.mock.calls[1][0])).toContain('?refresh=true');
    fetch.mockResolvedValueOnce(
        new Response(
            JSON.stringify({ ...data, videos: [{ ...data.videos[0], title: 'Fresh news' }] }),
        ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh publications' }));
    await waitFor(() => expect(screen.getByText('Fresh news')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).toBeNull();
});

it('shows partial failure warnings alongside the remaining channels and handles empty feeds', async () => {
    mockApi({
        'GET /widgets/9/data': {
            body: {
                ...data,
                channels: [data.channels[0]],
                videos: [],
                warnings: [{ channel: '@beta', message: 'Channel not found' }],
            },
        },
    });
    render(<WidgetRenderer widget={widget} />);
    expect(
        await screen.findByText('No recent publications from these channels.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('@beta: Channel not found');
});
