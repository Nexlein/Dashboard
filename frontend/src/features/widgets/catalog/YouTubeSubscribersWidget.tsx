import { Play, UsersRound } from 'lucide-react';
import type { WidgetViewProps } from '@/features/widgets/lib/types';

type ChannelSubscribers = {
    channelId: string;
    channelTitle: string;
    subscriberCount: number;
};

export function YouTubeSubscribersWidget({ data }: WidgetViewProps<ChannelSubscribers>) {
    if (!data) return null;
    return (
        <div
            className="flex h-full flex-col justify-center gap-3 p-2"
            data-testid="youtube-subscribers"
        >
            <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <Play className="size-5 shrink-0 text-red-600" aria-hidden="true" />
                <span className="truncate text-sm font-medium">{data.channelTitle}</span>
            </div>
            <div className="flex items-baseline gap-2">
                <strong className="text-4xl font-semibold tabular-nums">
                    {data.subscriberCount.toLocaleString()}
                </strong>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <UsersRound className="size-4" aria-hidden="true" />
                    subscribers
                </span>
            </div>
            <p className="text-xs text-muted-foreground">Rounded public count from YouTube</p>
            <a
                href={`https://www.youtube.com/channel/${encodeURIComponent(data.channelId)}`}
                target="_blank"
                rel="noreferrer"
                className="w-fit text-xs text-primary hover:underline"
            >
                View channel
            </a>
        </div>
    );
}
