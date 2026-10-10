import { formatDate, formatNumber } from '@/i18n/format';
import { getErrorMessage } from '@/i18n/errors';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, CheckCheck, Radio, RefreshCw } from 'lucide-react';
import { fetchClient } from '@/lib/apiClient';
import type { WidgetViewProps } from '@/features/widgets/lib/types';
import { widgetQueryKey } from '@/features/widgets/lib/widgets';
import { YOUTUBE_WATCH_HISTORY_PREFIX } from '@/lib/auth';

export type YouTubeWatchData = {
    channels: { id: string; title: string; checkedAt: string }[];
    videos: {
        id: string;
        title: string;
        channelId: string;
        channelTitle: string;
        publishedAt: string;
        url: string;
        thumbnail: string;
    }[];
    warnings: { channel: string; message: string; code?: string }[];
};

export function YouTubeWatchWidget({ data, widget }: WidgetViewProps<YouTubeWatchData>) {
    const { t } = useTranslation('youtube');
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('all');
    const storageKey = `${YOUTUBE_WATCH_HISTORY_PREFIX}${widget.id}`;
    const [seen, setSeen] = useState<string[]>(() => {
        try {
            const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
            return Array.isArray(saved)
                ? saved.filter((id): id is string => typeof id === 'string').slice(-300)
                : [];
        } catch {
            return [];
        }
    });
    const queryKey = widgetQueryKey(widget.id, widget.params);
    const isFetching = useIsFetching({ queryKey, exact: true }) > 0;
    const markSeen = (ids: string[]) => {
        setSeen((current) => {
            const next = [...new Set([...current, ...ids])].slice(-300);
            try {
                localStorage.setItem(storageKey, JSON.stringify(next));
            } catch {
                /* Still usable when browser storage is unavailable. */
            }
            return next;
        });
    };
    const [refreshError, setRefreshError] = useState<unknown>('');
    const [refreshing, setRefreshing] = useState(false);
    // Keep the previous feed visible during a manual refresh, including on failure.
    const refresh = async () => {
        setRefreshing(true);
        setRefreshError('');
        try {
            await queryClient.cancelQueries({ queryKey, exact: true });
            const fresh = await fetchClient<YouTubeWatchData>(
                `/widgets/${widget.id}/data?refresh=true`,
            );
            queryClient.setQueryData(queryKey, fresh);
        } catch (error) {
            setRefreshError(error);
        } finally {
            setRefreshing(false);
        }
    };
    const activeFilter = data.channels.some((channel) => channel.id === filter) ? filter : 'all';
    const visible = data.videos.filter(
        (video) => activeFilter === 'all' || video.channelId === activeFilter,
    );
    const busy = isFetching || refreshing;

    return (
        <div
            className="flex h-full min-h-0 w-full cursor-default flex-col gap-3"
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className="flex shrink-0 items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Radio className="size-4 text-red-500" aria-hidden="true" />
                    {t('channelWatch')}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        aria-label={t('markVisible')}
                        title={t('markSeen')}
                        disabled={!visible.some((video) => !seen.includes(video.id))}
                        onClick={() => markSeen(visible.map((video) => video.id))}
                        className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                        <CheckCheck className="size-4" />
                    </button>
                    <button
                        type="button"
                        aria-label={t('refreshPublications')}
                        title={t('refresh')}
                        disabled={busy}
                        onClick={refresh}
                        className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                        <RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
            <div
                className="flex shrink-0 gap-1.5 overflow-x-auto pb-1"
                aria-label={t('filterChannels')}
            >
                {[{ id: 'all', title: t('allChannels') }, ...data.channels].map((channel) => (
                    <button
                        key={channel.id}
                        type="button"
                        aria-pressed={activeFilter === channel.id}
                        onClick={() => setFilter(channel.id)}
                        className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeFilter === channel.id ? 'bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                    >
                        {channel.title}
                    </button>
                ))}
            </div>
            {Boolean(refreshError) && (
                <p role="alert" className="shrink-0 text-xs text-destructive">
                    {getErrorMessage(refreshError)} {t('savedPublications')}
                </p>
            )}
            {!!data.warnings.length && (
                <div
                    role="status"
                    className="shrink-0 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300"
                >
                    {data.warnings.map((warning) => (
                        <p key={warning.channel}>
                            {warning.channel}: {getErrorMessage(warning)}
                        </p>
                    ))}
                </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {!visible.length && (
                    <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                        {data.channels.length ? t('noPublications') : t('channelsUnavailable')}
                    </div>
                )}
                <div className="flex flex-col gap-3">
                    {visible.map((video) => (
                        <a
                            key={video.id}
                            href={video.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => markSeen([video.id])}
                            className="group flex gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                        >
                            <div className="relative aspect-video w-28 shrink-0 self-start overflow-hidden rounded-lg bg-muted">
                                <img
                                    src={video.thumbnail}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
                                />
                                {!seen.includes(video.id) && (
                                    <span className="absolute left-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">
                                        {t('new')}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
                                    {video.title}
                                </p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {video.channelTitle}
                                </p>
                                <div className="mt-1 flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
                                    <time dateTime={video.publishedAt}>
                                        {formatDate(new Date(video.publishedAt), {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </time>
                                    <ArrowUpRight
                                        className="ml-auto size-3 shrink-0"
                                        aria-hidden="true"
                                    />
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
            <p className="shrink-0 border-t pt-2 text-[0.625rem] text-muted-foreground">
                {t('updates', {
                    duration:
                        widget.refreshRate % 60 === 0
                            ? `${formatNumber(widget.refreshRate / 60)} min`
                            : `${formatNumber(widget.refreshRate)} s`,
                })}{' '}
                · {t('channels', { count: data.channels.length })}
            </p>
        </div>
    );
}
