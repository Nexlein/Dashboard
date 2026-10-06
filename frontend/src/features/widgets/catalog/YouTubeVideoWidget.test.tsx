import { expect, it } from 'vitest';
import { render, screen } from '@/test-utils';
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

it('offers a single player with no refresh timer or account parameter', () => {
    expect(REGISTRY.youtube.hasRefresh).toBe(false);
    expect(REGISTRY.youtube.widgets.map((item) => item.id)).toEqual(['video_player']);
    expect(REGISTRY.youtube.widgets[0].params.map((item) => item.id)).toEqual(['video_url']);
    expect(widget.title).toBe('YouTube Video');
});

it('renders a canonical YouTube player immediately without fetching widget data', () => {
    const fetch = mockApi({});
    const { rerender } = render(<WidgetRenderer widget={widget} />);
    const iframe = screen.getByTitle('YouTube video player');
    expect(iframe).toHaveAttribute(
        'src',
        'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?playsinline=1',
    );
    expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expect(iframe).toHaveAttribute('allowfullscreen');
    expect(screen.getByRole('link', { name: 'Open on YouTube' })).toHaveAttribute(
        'href',
        'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    );
    rerender(
        <WidgetRenderer
            widget={{ ...widget, params: { video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' } }}
        />,
    );
    expect(screen.getByTitle('YouTube video player')).toHaveAttribute(
        'src',
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?playsinline=1',
    );
    expect(fetch).not.toHaveBeenCalled();
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
