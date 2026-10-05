import { Eye, MessageCircle, Play, ThumbsUp } from 'lucide-react';
import type { WidgetViewProps } from '@/features/widgets/lib/types';

type LatestVideos = {
    channelId: string;
    channelTitle: string;
    videos: { videoId: string; title: string; publishedAt: string }[];
};

type VideoStats = {
    videoId: string;
    title: string;
    channelTitle: string;
    viewCount: number;
    likeCount: number | null;
    commentCount: number | null;
};

const videoUrl = (id: string) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

export function YouTubeLatestVideosWidget({ data }: WidgetViewProps<LatestVideos>) {
    if (!data) return null;
    return (
        <div className="flex h-full flex-col gap-3 overflow-y-auto p-2">
            <a
                href={`https://www.youtube.com/channel/${encodeURIComponent(data.channelId)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm font-medium hover:underline"
            >
                <Play className="size-5 shrink-0 text-red-600" aria-hidden="true" />
                <span className="truncate">{data.channelTitle}</span>
            </a>
            {data.videos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No public videos available.</p>
            ) : (
                <ul className="divide-y divide-border">
                    {data.videos.map((video) => (
                        <li key={video.videoId} className="py-3 first:pt-0">
                            <a
                                href={videoUrl(video.videoId)}
                                target="_blank"
                                rel="noreferrer"
                                className="line-clamp-2 text-sm font-medium text-primary hover:underline"
                            >
                                {video.title}
                            </a>
                            <time
                                dateTime={video.publishedAt}
                                className="mt-1 block text-xs text-muted-foreground"
                            >
                                {new Date(video.publishedAt).toLocaleDateString()}
                            </time>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function YouTubeVideoStatsWidget({ data }: WidgetViewProps<VideoStats>) {
    if (!data) return null;
    const metrics = [
        { label: 'Views', value: data.viewCount, icon: Eye },
        { label: 'Likes', value: data.likeCount, icon: ThumbsUp },
        { label: 'Comments', value: data.commentCount, icon: MessageCircle },
    ];
    return (
        <div className="flex h-full flex-col gap-3 overflow-y-auto p-2">
            <a
                href={videoUrl(data.videoId)}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-2 text-sm font-medium text-primary hover:underline"
            >
                {data.title}
            </a>
            <p className="truncate text-xs text-muted-foreground">{data.channelTitle}</p>
            <dl className="space-y-3">
                {metrics.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex flex-wrap items-center justify-between gap-2">
                        <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Icon className="size-4" aria-hidden="true" />
                            {label}
                        </dt>
                        <dd className="font-semibold tabular-nums">
                            {value == null ? 'Unavailable' : value.toLocaleString()}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
