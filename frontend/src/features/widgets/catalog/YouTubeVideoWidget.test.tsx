import { expect, it } from 'vitest';
import { fireEvent, render, screen } from '@/test-utils';
import { mockApi } from '@/test/fixtures';
import { REGISTRY } from '@/features/widgets/lib/registry';
import { getDefaultWidgetLayout, toDashboardWidget } from '@/features/widgets/lib/widgets';
import WidgetRenderer from '@/features/widgets/components/WidgetRenderer';

const widget = toDashboardWidget({
    id: 9,
    serviceName: 'youtube',
    widgetName: 'video_player',
    params: { video_url: 'https://youtu.be/M7lc1UVf-VE?si=share' },
    refreshRate: 60,
    layout: getDefaultWidgetLayout('youtube', 'video_player'),
});

it('offers a player and watch feed without connection parameters', () => {
    expect(REGISTRY.youtube.hasRefresh).toBe(false);
    expect(REGISTRY.youtube.widgets.map((item) => item.id)).toEqual([
        'video_player',
        'channel_watch',
    ]);
    expect(REGISTRY.youtube.widgets[0].params.map((item) => item.id)).toEqual(['video_url']);
    expect(widget.title).toBe('YouTube Video');
});

it('loads the player only on play and stops it when returning to the preview', () => {
    const fetch = mockApi({});
    render(<WidgetRenderer widget={widget} />);
    expect(screen.queryByTitle('YouTube video player')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Play YouTube video' }));
    const iframe = screen.getByTitle('YouTube video player');
    expect(iframe).toHaveAttribute(
        'src',
        'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?playsinline=1&autoplay=1',
    );
    expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expect(iframe).toHaveAttribute('allowfullscreen');
    expect(screen.getByRole('link', { name: 'Open on YouTube' })).toHaveAttribute(
        'href',
        'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Stop video' }));
    expect(screen.queryByTitle('YouTube video player')).toBeNull();
    expect(screen.getByRole('button', { name: 'Play YouTube video' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
});

it('returns to the preview when editing the video instead of autoplaying the replacement', () => {
    mockApi({});
    const { rerender } = render(<WidgetRenderer widget={widget} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play YouTube video' }));
    rerender(
        <WidgetRenderer
            widget={{ ...widget, params: { video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' } }}
        />,
    );
    expect(screen.queryByTitle('YouTube video player')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Play YouTube video' }));
    expect(screen.getByTitle('YouTube video player')).toHaveAttribute(
        'src',
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?playsinline=1&autoplay=1',
    );
});

it('keeps play available if the thumbnail cannot load', () => {
    mockApi({});
    render(<WidgetRenderer widget={widget} />);
    const play = screen.getByRole('button', { name: 'Play YouTube video' });
    fireEvent.error(play.querySelector('img')!);
    expect(play.querySelector('img')).toBeNull();
    fireEvent.click(play);
    expect(screen.getByTitle('YouTube video player')).toBeInTheDocument();
});

it('does not embed arbitrary saved URLs', () => {
    render(
        <WidgetRenderer
            widget={{ ...widget, params: { video_url: 'https://evil.example/embed' } }}
        />,
    );
    expect(screen.queryByTitle('YouTube video player')).toBeNull();
    expect(screen.getByText(/enter a valid YouTube video link/)).toBeInTheDocument();
});
