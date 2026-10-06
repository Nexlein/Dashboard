import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { YouTubeSubscribersWidget } from './YouTubeSubscribersWidget';
import { REGISTRY, findWidgetDefinition } from '@/features/widgets/lib/registry';
import { getDefaultWidgetLayout, toDashboardWidget } from '@/features/widgets/lib/widgets';

describe('YouTube subscriber widget', () => {
    it('appears in the catalog and renders the subscriber count and channel', () => {
        const widget = toDashboardWidget({
            id: 9,
            serviceName: 'youtube',
            widgetName: 'channel_stats',
            params: { channel_id: `UC${'a'.repeat(22)}` },
            refreshRate: 60,
            layout: getDefaultWidgetLayout('youtube', 'channel_stats'),
        });
        expect(findWidgetDefinition('youtube', 'channel_stats')?.params[0].id).toBe('channel_id');
        expect(REGISTRY.youtube.widgets.map((item) => item.id)).toEqual(['channel_stats']);
        expect(REGISTRY.youtube.widgets[0].params).toHaveLength(1);
        expect(widget.title).toBe('YouTube Subscribers');
        render(
            <YouTubeSubscribersWidget
                widget={widget}
                data={{
                    channelId: `UC${'a'.repeat(22)}`,
                    channelTitle: 'Our channel',
                    subscriberCount: 1230,
                }}
                onPeriodChange={() => {}}
                periodUpdating={false}
            />,
        );
        expect(screen.getByText('Our channel')).toBeInTheDocument();
        expect(screen.getByText((text) => text.replace(/\s/g, '') === '1,230')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'View channel' })).toHaveAttribute(
            'href',
            `https://www.youtube.com/channel/UC${'a'.repeat(22)}`,
        );
    });
});
