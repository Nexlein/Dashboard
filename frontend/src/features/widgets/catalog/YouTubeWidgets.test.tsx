import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { YouTubeLatestVideosWidget, YouTubeVideoStatsWidget } from './YouTubeWidgets';
import { REGISTRY } from '@/features/widgets/lib/registry';
import { getDefaultWidgetLayout, toDashboardWidget } from '@/features/widgets/lib/widgets';

const props = {
    widget: toDashboardWidget({
        id: 1,
        serviceName: 'youtube',
        widgetName: 'latest_videos',
        params: {},
        refreshRate: 60,
        layout: getDefaultWidgetLayout('youtube', 'latest_videos'),
    }),
    onPeriodChange: () => {},
    periodUpdating: false,
};

describe('YouTube widgets', () => {
    it('offers exactly three configured widgets with dashboard titles', () => {
        expect(REGISTRY.youtube.widgets.map((widget) => widget.id)).toEqual([
            'channel_stats',
            'latest_videos',
            'video_stats',
        ]);
        for (const definition of REGISTRY.youtube.widgets) {
            const widget = toDashboardWidget({
                ...props.widget,
                widgetName: definition.id,
                layout: getDefaultWidgetLayout('youtube', definition.id),
            });
            expect(widget.title).toMatch(/^YouTube /);
            expect(definition.params[1].id).toBe(
                definition.id === 'video_stats' ? 'video_id' : 'channel_id',
            );
        }
    });

    it('shows upload titles, dates and safe YouTube links', () => {
        render(
            <YouTubeLatestVideosWidget
                {...props}
                data={{
                    channelId: 'UCexample',
                    channelTitle: 'Our channel',
                    videos: [
                        {
                            videoId: 'abcdefghijk',
                            title: 'Latest upload',
                            publishedAt: '2026-10-01T12:00:00Z',
                        },
                    ],
                }}
            />,
        );
        const link = screen.getByRole('link', { name: 'Latest upload' });
        expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdefghijk');
        expect(link).toHaveAttribute('rel', 'noreferrer');
        expect(screen.getByRole('link', { name: 'Our channel' })).toHaveAttribute(
            'href',
            'https://www.youtube.com/channel/UCexample',
        );
        expect(document.querySelector('time')).toHaveAttribute('datetime', '2026-10-01T12:00:00Z');
    });

    it('explains the empty uploads state', () => {
        render(
            <YouTubeLatestVideosWidget
                {...props}
                data={{ channelId: 'UCexample', channelTitle: 'Our channel', videos: [] }}
            />,
        );
        expect(screen.getByText('No public videos available.')).toBeInTheDocument();
    });

    it('renders views, zero likes and unavailable comments distinctly', () => {
        render(
            <YouTubeVideoStatsWidget
                {...props}
                data={{
                    videoId: 'abcdefghijk',
                    title: 'A video',
                    channelTitle: 'Our channel',
                    viewCount: 1230,
                    likeCount: 0,
                    commentCount: null,
                }}
            />,
        );
        expect(screen.getByRole('link', { name: 'A video' })).toHaveAttribute(
            'href',
            'https://www.youtube.com/watch?v=abcdefghijk',
        );
        expect(screen.getByText((1230).toLocaleString())).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
        for (const label of ['Views', 'Likes', 'Comments'])
            expect(screen.getByText(label)).toBeInTheDocument();
    });
});
