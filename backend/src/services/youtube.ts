import { HttpError } from '../utils/httpError.ts';
import { getCache, setCache } from '../utils/redisCache.ts';
import type {
    ServiceContext,
    ServiceCredentials,
    ServiceDefinition,
    WidgetParams,
} from './types.ts';
import { YOUTUBE_SERVICE_PROVIDER } from '../utils/oauthProviders.ts';

type YouTubeResponse = {
    items?: {
        id: string;
        snippet?: { title?: string; channelTitle?: string };
        statistics?: {
            hiddenSubscriberCount?: boolean;
            subscriberCount?: string;
            viewCount?: string;
            likeCount?: string;
            commentCount?: string;
        };
        contentDetails?: {
            relatedPlaylists?: { uploads?: string };
            videoId?: string;
            videoPublishedAt?: string;
        };
        status?: { privacyStatus?: string };
    }[];
};

const MAX_CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_REFRESH_RATE_SECONDS = 60;

async function youtubeRequest(
    resource: string,
    params: Record<string, string>,
    context: ServiceContext,
) {
    const url = `https://www.googleapis.com/youtube/v3/${resource}?${new URLSearchParams(params)}`;
    const accessToken = context.credentials?.accessToken;
    if (typeof accessToken !== 'string' || !accessToken)
        throw new HttpError('YouTube is not connected. Link it in Services.', 409);
    let response;
    try {
        response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(10000),
        });
    } catch {
        throw new HttpError('YouTube is unavailable', 502);
    }
    if (response.status === 401) {
        throw new HttpError('Reconnect YouTube in Services to restore access', 409);
    }
    if (response.status === 404) throw new HttpError('YouTube resource not found', 404);
    if (response.status === 403)
        throw new HttpError('YouTube denied access or reached its quota', 502);
    if (!response.ok) throw new HttpError('YouTube request failed', 502);
    try {
        return (await response.json()) as YouTubeResponse;
    } catch {
        throw new HttpError('YouTube returned an invalid response', 502);
    }
}

function statistic(value: unknown, label: string, optional = false) {
    if (optional && value == null) return null;
    if (!/^[0-9]+$/.test(String(value))) {
        throw new HttpError(`YouTube returned an invalid ${label}`, 502);
    }
    const count = Number(value);
    if (!Number.isSafeInteger(count)) {
        throw new HttpError(`YouTube returned an invalid ${label}`, 502);
    }
    return count;
}

async function execute(widgetName: string, params: WidgetParams, context: ServiceContext) {
    if (!['channel_stats', 'latest_videos', 'video_stats'].includes(widgetName)) {
        throw new HttpError('Unsupported YouTube widget', 400);
    }
    const isVideo = widgetName === 'video_stats';
    const rawId = params[isVideo ? 'video_id' : 'channel_id'];
    const id = typeof rawId === 'string' ? rawId.trim() : '';
    if (!(isVideo ? /^[A-Za-z0-9_-]{11}$/ : /^UC[A-Za-z0-9_-]{22}$/).test(id)) {
        throw new HttpError(`A valid YouTube ${isVideo ? 'video' : 'channel'} ID is required`, 400);
    }
    if (!context.credentials?.accessToken) {
        throw new HttpError('YouTube is not connected. Link it in Services.', 409);
    }
    const cacheKey = `${context.cacheScope || context.userId || 'unscoped'}:youtube:${widgetName}:${id}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    let result: Record<string, unknown>;
    if (isVideo) {
        const data = await youtubeRequest('videos', { part: 'snippet,statistics', id }, context);
        const video = data.items?.[0];
        if (!video) throw new HttpError('YouTube video not found or unavailable', 404);
        result = {
            videoId: video.id,
            title: video.snippet?.title || id,
            channelTitle: video.snippet?.channelTitle || '',
            viewCount: statistic(video.statistics?.viewCount, 'view count'),
            likeCount: statistic(video.statistics?.likeCount, 'like count', true),
            commentCount: statistic(video.statistics?.commentCount, 'comment count', true),
        };
    } else {
        const data = await youtubeRequest(
            'channels',
            {
                part:
                    widgetName === 'latest_videos'
                        ? 'snippet,contentDetails'
                        : 'snippet,statistics',
                id,
            },
            context,
        );
        const channel = data.items?.[0];
        if (!channel) throw new HttpError('YouTube channel not found', 404);
        result = { channelId: channel.id, channelTitle: channel.snippet?.title || id };
        if (widgetName === 'channel_stats') {
            if (
                channel.statistics?.hiddenSubscriberCount ||
                channel.statistics?.subscriberCount == null
            ) {
                throw new HttpError('Subscriber count is hidden for this channel', 409);
            }
            result.subscriberCount = statistic(
                channel.statistics.subscriberCount,
                'subscriber count',
            );
        } else {
            const playlistId = channel.contentDetails?.relatedPlaylists?.uploads;
            if (!playlistId) throw new HttpError('YouTube uploads playlist is unavailable', 404);
            const uploads = await youtubeRequest(
                'playlistItems',
                {
                    part: 'snippet,contentDetails,status',
                    playlistId,
                    maxResults: '5',
                },
                context,
            );
            result.videos = (uploads.items || [])
                .filter(
                    (item) =>
                        /^[A-Za-z0-9_-]{11}$/.test(item.contentDetails?.videoId ?? '') &&
                        item.status?.privacyStatus !== 'private' &&
                        item.contentDetails?.videoPublishedAt,
                )
                .map((item) => ({
                    videoId: item.contentDetails!.videoId,
                    title: item.snippet?.title || item.contentDetails!.videoId,
                    publishedAt: item.contentDetails!.videoPublishedAt,
                }));
        }
    }
    const requestedRefresh = Number(context.refreshRate);
    const ttlMs = Math.min(
        Math.max(
            Number.isFinite(requestedRefresh) ? requestedRefresh : MIN_REFRESH_RATE_SECONDS,
            MIN_REFRESH_RATE_SECONDS,
        ) * 1000,
        MAX_CACHE_TTL_MS,
    );
    await setCache(cacheKey, result, ttlMs);
    return result;
}

export default {
    name: 'youtube',
    displayName: 'YouTube',
    description: 'Channel subscribers, latest uploads and video statistics',
    connection: { type: 'oauth', label: 'YouTube account', provider: YOUTUBE_SERVICE_PROVIDER },
    widgets: [
        {
            name: 'channel_stats',
            description: 'Displays the subscriber count for a channel',
            params: [
                { name: 'account', type: 'string' },
                { name: 'channel_id', type: 'string' },
            ],
        },
        {
            name: 'latest_videos',
            description: 'Displays the five latest uploads from a channel',
            params: [
                { name: 'account', type: 'string' },
                { name: 'channel_id', type: 'string' },
            ],
        },
        {
            name: 'video_stats',
            description: 'Displays views, likes and comments for a video',
            params: [
                { name: 'account', type: 'string' },
                { name: 'video_id', type: 'string' },
            ],
        },
    ],
    execute,
    async describeAccount(credentials: ServiceCredentials) {
        const data = await youtubeRequest(
            'channels',
            { part: 'snippet', mine: 'true' },
            { userId: 0, credentials },
        );
        const channel = data.items?.[0];
        return { login: channel?.snippet?.title ?? 'YouTube account' };
    },
} satisfies ServiceDefinition;
