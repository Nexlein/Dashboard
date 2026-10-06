import { youtubeVideoId } from 'shared/youtube';
import type { WidgetViewProps } from '@/features/widgets/lib/types';

export function YouTubeVideoWidget({ widget }: WidgetViewProps<unknown>) {
    const videoId = youtubeVideoId(widget.params.video_url);
    if (!videoId) {
        return (
            <p className="p-4 text-sm text-muted-foreground">
                Edit this widget and enter a valid YouTube video link.
            </p>
        );
    }
    return (
        <div className="flex h-full min-h-0 flex-col gap-2">
            <iframe
                key={videoId}
                title="YouTube video player"
                src={`https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1`}
                className="min-h-[200px] w-full flex-1 rounded-md border-0 bg-black"
                allow="encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
            />
            <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs text-muted-foreground hover:text-primary hover:underline"
            >
                Open on YouTube
            </a>
        </div>
    );
}
