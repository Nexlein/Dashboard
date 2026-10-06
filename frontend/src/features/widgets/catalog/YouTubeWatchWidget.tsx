import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, CheckCheck, Loader2, Radio, RefreshCw } from 'lucide-react';
import { fetchClient } from '@/lib/apiClient';
import type { WidgetViewProps } from '@/features/widgets/lib/types';
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
    warnings: { channel: string; message: string }[];
};

export function YouTubeWatchWidget({ widget }: WidgetViewProps<unknown>) {
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
    const query = useQuery({
        queryKey: ['youtube-watch', widget.id, widget.params.channels],
        queryFn: () => fetchClient<YouTubeWatchData>(`/widgets/${widget.id}/data`),
        staleTime: 600_000,
        refetchInterval: 600_000,
        refetchOnWindowFocus: false,
        retry: false,
    });
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
    const [refreshError, setRefreshError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    // Keep the previous feed visible during a manual refresh, including on failure.
    const refresh = async () => {
        setRefreshing(true);
        setRefreshError('');
        try {
            const fresh = await fetchClient<YouTubeWatchData>(
                `/widgets/${widget.id}/data?refresh=true`,
            );
            queryClient.setQueryData(['youtube-watch', widget.id, widget.params.channels], fresh);
        } catch (error) {
            setRefreshError(error instanceof Error ? error.message : 'Unable to refresh the feed');
        } finally {
            setRefreshing(false);
        }
    };
    const activeFilter = query.data?.channels.some((channel) => channel.id === filter)
        ? filter
        : 'all';
    const visible =
        query.data?.videos.filter(
            (video) => activeFilter === 'all' || video.channelId === activeFilter,
        ) ?? [];
    const busy = query.isFetching || refreshing;

    return (
        <div
            className="flex h-full min-h-0 w-full cursor-default flex-col gap-3"
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className="flex shrink-0 items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Radio className="size-4 text-red-500" aria-hidden="true" /> Channel Watch
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        aria-label="Mark visible publications as seen"
                        title="Mark as seen"
                        disabled={!visible.some((video) => !seen.includes(video.id))}
                        onClick={() => markSeen(visible.map((video) => video.id))}
                        className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                        <CheckCheck className="size-4" />
                    </button>
                    <button
                        type="button"
                        aria-label="Refresh publications"
                        title="Refresh"
                        disabled={busy}
                        onClick={refresh}
                        className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                        <RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
            {query.data && (
                <div
                    className="flex shrink-0 gap-1.5 overflow-x-auto pb-1"
                    aria-label="Filter publications by channel"
                >
                    {[{ id: 'all', title: 'All channels' }, ...query.data.channels].map(
                        (channel) => (
                            <button
                                key={channel.id}
                                type="button"
                                aria-pressed={activeFilter === channel.id}
                                onClick={() => setFilter(channel.id)}
                                className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeFilter === channel.id ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                            >
                                {channel.title}
                            </button>
                        ),
                    )}
                </div>
            )}
            {(query.error || refreshError) && (
                <p role="alert" className="shrink-0 text-xs text-destructive">
                    {refreshError || query.error?.message}
                    {query.data && ' Showing saved publications.'}
                </p>
            )}
            {!!query.data?.warnings.length && (
                <div
                    role="status"
                    className="shrink-0 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300"
                >
                    {query.data.warnings.map((warning) => (
                        <p key={warning.channel}>
                            {warning.channel}: {warning.message}
                        </p>
                    ))}
                </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {query.isPending && (
                    <div
                        className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"
                        role="status"
                    >
                        <Loader2 className="size-4 animate-spin" /> Loading publications…
                    </div>
                )}
                {query.data && !visible.length && (
                    <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                        {query.data.channels.length
                            ? 'No recent publications from these channels.'
                            : 'Channels are unavailable. Try refreshing or edit your channel list.'}
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
                                    <span className="absolute left-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                        New
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
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <time dateTime={video.publishedAt}>
                                        {new Date(video.publishedAt).toLocaleDateString(undefined, {
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
            <p className="shrink-0 border-t pt-2 text-[10px] text-muted-foreground">
                Updates every 10 min · {query.data?.channels.length ?? 0} channel(s)
            </p>
        </div>
    );
}
