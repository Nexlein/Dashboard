import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { youtubeChannels } from 'shared';
import { getCache, setCache } from '../utils/redisCache.ts';
import { HttpError } from '../utils/httpError.ts';
import type { ServiceContext, WidgetParams } from './types.ts';

const TEN_MINUTES = 600_000;
const DAY = 86_400_000;
const pending = new Map<string, Promise<ChannelFeed>>();
type Video = {
    id: string;
    title: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    url: string;
    thumbnail: string;
};
type ChannelFeed = { id: string; title: string; videos: Video[]; checkedAt: string };
type FeedResult = { channel: ChannelFeed | null; warning?: { channel: string; message: string } };

// Only our fixed YouTube origin is fetched. Redirects, oversized responses and slow reads
// are rejected; the timeout covers the body as well as the response headers.
async function fetchYouTubeText(path: string, limit: number): Promise<string> {
    const response = await fetch(`https://www.youtube.com${path}`, {
        signal: AbortSignal.timeout(12_000),
        redirect: 'error',
        headers: path.startsWith('/feeds/')
            ? { Accept: 'application/atom+xml' }
            : // Decline optional cookies: public handle pages otherwise redirect to consent
              // in some regions. No account cookies are stored or forwarded.
              { Accept: 'text/html', Cookie: 'SOCS=CAI' },
    });
    if (!response.ok)
        throw new HttpError(
            response.status === 404 ? 'Channel not found' : 'YouTube is temporarily unavailable',
            response.status === 404 ? 404 : 502,
        );
    if (!response.body) throw new HttpError('YouTube returned an empty response', 502);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > limit) throw new HttpError('YouTube response is too large', 502);
            chunks.push(value);
        }
    } finally {
        await reader.cancel();
    }
    return Buffer.concat(chunks).toString('utf8');
}

async function youtubeText(path: string, limit: number): Promise<string> {
    const key = `youtube:failure:v1:${path}`;
    const failure = await getCache<{ message: string; statusCode: number }>(key);
    if (failure) throw new HttpError(failure.message, failure.statusCode);
    try {
        return await fetchYouTubeText(path, limit);
    } catch (error) {
        const details =
            error instanceof HttpError
                ? error
                : new HttpError('YouTube is temporarily unavailable.', 502);
        await setCache(key, { message: details.message, statusCode: details.statusCode }, 60_000);
        throw details;
    }
}

async function resolveChannel(input: string): Promise<string> {
    if (input.startsWith('UC')) return input;
    const key = `youtube:handle:v1:${input}`;
    const cached = await getCache<string>(key);
    if (cached) return cached;
    const html = await youtubeText(`/@${encodeURIComponent(input.slice(1))}`, 6_000_000);
    const id =
        html.match(
            /"channelMetadataRenderer"\s*:\s*\{[^}]*"externalId"\s*:\s*"(UC[A-Za-z0-9_-]{22})"/,
        )?.[1] ??
        html.match(
            /<link\b[^>]*rel="canonical"[^>]*href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/,
        )?.[1];
    if (!id)
        throw new HttpError(
            'Cannot resolve this handle. Try its youtube.com/channel/UC… link.',
            404,
        );
    await setCache(key, id, DAY);
    return id;
}

type AtomEntry = { 'yt:videoId'?: unknown; title?: unknown; published?: unknown };
type AtomFeed = { 'yt:channelId'?: unknown; title?: unknown; entry?: AtomEntry[] };
const parser = new XMLParser({
    parseTagValue: false,
    processEntities: true,
    isArray: (name) => name === 'entry',
});

export function parseYouTubeFeed(xml: string, channelId: string): ChannelFeed {
    if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
        throw new HttpError('Invalid YouTube feed', 502);
    const feed = (parser.parse(xml) as { feed?: AtomFeed }).feed;
    // YouTube's Atom channelId omits UC on current feeds; older feeds include it.
    if (
        !feed ||
        ![channelId, channelId.slice(2)].includes(String(feed['yt:channelId'])) ||
        typeof feed.title !== 'string'
    )
        throw new HttpError('Invalid YouTube channel feed', 502);
    const title = feed.title.slice(0, 200);
    const videos = (feed.entry ?? [])
        .flatMap((entry) => {
            if (!entry || typeof entry !== 'object') return [];
            const id = entry['yt:videoId'];
            const publishedAt = typeof entry.published === 'string' ? entry.published : '';
            if (
                typeof id !== 'string' ||
                !/^[A-Za-z0-9_-]{11}$/.test(id) ||
                typeof entry.title !== 'string' ||
                !Number.isFinite(Date.parse(publishedAt))
            )
                return [];
            return [
                {
                    id,
                    title: entry.title.slice(0, 500),
                    channelId,
                    channelTitle: title,
                    publishedAt: new Date(publishedAt).toISOString(),
                    url: `https://www.youtube.com/watch?v=${id}`,
                    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
                },
            ];
        })
        .slice(0, 15);
    return { id: channelId, title, videos, checkedAt: new Date().toISOString() };
}

async function loadChannel(id: string, force: boolean): Promise<ChannelFeed> {
    const key = `youtube:feed:v1:${id}`;
    const cached = await getCache<ChannelFeed>(key);
    if (cached && Date.now() - Date.parse(cached.checkedAt) < (force ? 60_000 : TEN_MINUTES))
        return cached;
    const inFlight = pending.get(id);
    if (inFlight) return inFlight;
    const request = (async () => {
        const xml = await youtubeText(`/feeds/videos.xml?channel_id=${id}`, 1_000_000);
        const feed = parseYouTubeFeed(xml, id);
        await setCache(key, feed, DAY);
        return feed;
    })();
    pending.set(id, request);
    try {
        return await request;
    } finally {
        pending.delete(id);
    }
}

async function channelResult(input: string, force: boolean): Promise<FeedResult> {
    let id: string | undefined;
    try {
        id = await resolveChannel(input);
        return { channel: await loadChannel(id, force) };
    } catch (error) {
        const cached = id ? await getCache<ChannelFeed>(`youtube:feed:v1:${id}`) : null;
        return {
            channel: cached,
            warning: {
                channel: cached?.title ?? input,
                message: cached
                    ? 'Refresh unavailable; showing saved publications.'
                    : error instanceof HttpError
                      ? error.message
                      : 'YouTube is temporarily unavailable.',
            },
        };
    }
}

export async function youtubeWatch(params: WidgetParams, context: ServiceContext) {
    const inputs = youtubeChannels(params.channels);
    if (!inputs) throw new HttpError('Add between 1 and 5 valid YouTube channels', 400);
    const results = await Promise.all(
        inputs.map((input) => channelResult(input, context.forceRefresh === true)),
    );
    const channels = [
        ...new Map(
            results.flatMap(({ channel }) => (channel ? [[channel.id, channel] as const] : [])),
        ).values(),
    ];
    const warnings = results.flatMap(({ warning }) => (warning ? [warning] : []));
    const videos = [
        ...new Map(
            channels.flatMap((channel) => channel.videos).map((video) => [video.id, video]),
        ).values(),
    ].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    return {
        channels: channels.map(({ id, title, checkedAt }) => ({ id, title, checkedAt })),
        videos,
        warnings,
    };
}
