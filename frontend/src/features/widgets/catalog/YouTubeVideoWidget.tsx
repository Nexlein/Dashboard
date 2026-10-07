import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ArrowUpRight, Play, Square } from 'lucide-react';
import { youtubeVideoId } from 'shared';
import { youtubeThumbnailUrl } from '@/features/widgets/lib/youtube';
import type { WidgetViewProps } from '@/features/widgets/lib/types';

export function YouTubeVideoWidget({ widget }: WidgetViewProps<unknown>) {
    const { t } = useTranslation('youtube');
    const videoId = youtubeVideoId(widget.params.video_url);
    if (!videoId) {
        return <p className="p-4 text-sm text-muted-foreground">{t('invalidVideo')}</p>;
    }
    return <YouTubePlayer key={videoId} videoId={videoId} />;
}

function YouTubePlayer({ videoId }: { videoId: string }) {
    const { t } = useTranslation('youtube');
    const [playing, setPlaying] = useState(false);
    const [thumbnailFailed, setThumbnailFailed] = useState(false);

    return (
        <div
            className="flex h-full min-h-0 w-full cursor-default flex-col bg-black"
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className="relative min-h-[200px] flex-1 overflow-hidden">
                {playing ? (
                    <iframe
                        title={t('player')}
                        src={`https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&autoplay=1`}
                        className="absolute inset-0 h-full w-full border-0"
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                    />
                ) : (
                    <button
                        type="button"
                        aria-label={t('playYoutube')}
                        onClick={() => setPlaying(true)}
                        className="group absolute inset-0 flex h-full w-full cursor-pointer items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-800 to-black focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
                    >
                        {!thumbnailFailed && (
                            <img
                                src={youtubeThumbnailUrl(videoId)}
                                alt=""
                                loading="eager"
                                fetchPriority="high"
                                draggable={false}
                                onError={() => setThumbnailFailed(true)}
                                className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-105 group-hover:opacity-100 motion-reduce:transform-none motion-reduce:transition-none"
                            />
                        )}
                        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <span className="relative flex size-16 items-center justify-center rounded-full bg-red-600 text-white shadow-xl transition duration-200 group-hover:scale-110 group-hover:bg-red-500 motion-reduce:transform-none motion-reduce:transition-none">
                            <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
                        </span>
                        <span className="absolute bottom-5 left-5 text-sm font-medium text-white">
                            {t('play')}
                        </span>
                    </button>
                )}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-2.5 text-xs text-zinc-400">
                {playing ? (
                    <button
                        type="button"
                        onClick={() => setPlaying(false)}
                        className="flex cursor-pointer items-center gap-1.5 rounded-sm hover:text-white focus-visible:outline-2 focus-visible:outline-white"
                    >
                        <Square className="size-3" aria-hidden="true" />
                        {t('stop')}
                    </button>
                ) : (
                    <span>{t('ready')}</span>
                )}
                <a
                    href={`https://www.youtube.com/watch?v=${videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-sm hover:text-white focus-visible:outline-2 focus-visible:outline-white"
                >
                    {t('open')}
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                </a>
            </div>
        </div>
    );
}
