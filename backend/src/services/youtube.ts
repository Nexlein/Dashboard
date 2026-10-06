import { createHash } from 'node:crypto';
import { HttpError } from '../utils/httpError.ts';
import { getCache, setCache } from '../utils/redisCache.ts';
import type {
    ServiceContext,
    ServiceCredentials,
    ServiceDefinition,
    WidgetParams,
} from './types.ts';

type ChannelSubscribers = { channelId: string; channelTitle: string; subscriberCount: number };

type YouTubeError = { error?: { errors?: { reason?: string }[]; details?: { reason?: string }[] } };

type YouTubeResponse = {
    items?: {
        id: string;
        snippet?: { title?: string };
        statistics?: { hiddenSubscriberCount?: boolean; subscriberCount?: string };
    }[];
};

const VERIFICATION_CHANNEL = 'UC_x5XG1OV2P6uZZ5FSM9Ttw';
const MIN_REFRESH_SECONDS = 60;
const MAX_CACHE_TTL_MS = 5 * 60 * 1000;

function channelSelector(params: WidgetParams): Record<string, string> {
    const target = typeof params.channel_id === 'string' ? params.channel_id.trim() : '';
    if (/^UC[A-Za-z0-9_-]{22}$/.test(target)) return { id: target };
    if (/^@[\p{L}\p{N}_.·-]{3,30}$/u.test(target)) return { forHandle: target };
    throw new HttpError('A valid YouTube channel ID (UC...) or @handle is required', 400);
}

function apiKey(credentials?: ServiceCredentials | null): string {
    const key = credentials?.apiKey;
    if (typeof key !== 'string' || !key.trim()) {
        throw new HttpError('YouTube is not connected. Add an API key in Services.', 409);
    }
    return key.trim();
}

async function channelsRequest(params: Record<string, string>, key: string) {
    const query = new URLSearchParams({ ...params, key });
    let response: Response;
    try {
        response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${query}`, {
            signal: AbortSignal.timeout(10000),
        });
    } catch {
        throw new HttpError('YouTube is unavailable', 502);
    }
    if (!response.ok) {
        const error = (await response.json().catch(() => null)) as YouTubeError | null;
        const reasons = Array.isArray(error?.error?.errors)
            ? error.error.errors.map((item) => item?.reason)
            : [];
        if (
            response.status === 429 ||
            reasons.includes('quotaExceeded') ||
            reasons.includes('dailyLimitExceeded')
        ) {
            throw new HttpError('YouTube API quota reached. Try again later.', 429);
        }
        if (
            reasons.includes('accessNotConfigured') ||
            error?.error?.details?.some(
                (item: { reason?: string }) => item.reason === 'SERVICE_DISABLED',
            )
        ) {
            throw new HttpError('Enable YouTube Data API v3 in your Google Cloud project.', 400);
        }
        if ([400, 401, 403].includes(response.status)) {
            throw new HttpError('YouTube API key is invalid or its restrictions deny access.', 400);
        }
        if (response.status === 404) throw new HttpError('YouTube channel not found', 404);
        throw new HttpError('YouTube request failed', 502);
    }
    try {
        const data = (await response.json()) as YouTubeResponse;
        if (!data || !Array.isArray(data.items)) throw new Error('Invalid response');
        return data;
    } catch {
        throw new HttpError('YouTube returned an invalid response', 502);
    }
}

async function execute(widgetName: string, params: WidgetParams, context: ServiceContext) {
    validateParams(widgetName, params);
    const selector = channelSelector(params);
    const key = apiKey(context.credentials);
    const target = selector.id ?? selector.forHandle;
    const keyVersion = createHash('sha256').update(key).digest('hex').slice(0, 16);
    const cacheKey = `${context.cacheScope || context.userId}:youtube:${keyVersion}:channel_stats:${target}`;
    const cached = await getCache<ChannelSubscribers>(cacheKey);
    if (cached) return cached;

    const data = await channelsRequest({ part: 'snippet,statistics', ...selector }, key);
    const channel = data.items?.[0];
    if (!channel) throw new HttpError('YouTube channel not found', 404);
    const value = channel.statistics?.subscriberCount;
    if (channel.statistics?.hiddenSubscriberCount || value == null) {
        throw new HttpError('Subscriber count is hidden for this channel', 409);
    }
    const subscriberCount = Number(value);
    if (!/^[0-9]+$/.test(String(value)) || !Number.isSafeInteger(subscriberCount)) {
        throw new HttpError('YouTube returned an invalid subscriber count', 502);
    }
    if (!/^UC[A-Za-z0-9_-]{22}$/.test(channel.id)) {
        throw new HttpError('YouTube returned an invalid channel ID', 502);
    }
    const result = {
        channelId: channel.id,
        channelTitle: channel.snippet?.title || channel.id,
        subscriberCount,
    };
    const refresh = Number(context.refreshRate);
    const ttl = Math.min(
        Math.max(Number.isFinite(refresh) ? refresh : MIN_REFRESH_SECONDS, MIN_REFRESH_SECONDS) *
            1000,
        MAX_CACHE_TTL_MS,
    );
    await setCache(cacheKey, result, ttl);
    return result;
}

function validateParams(widgetName: string, params: WidgetParams) {
    if (widgetName !== 'channel_stats') throw new HttpError('Unsupported YouTube widget', 400);
    channelSelector(params);
}

export default {
    name: 'youtube',
    displayName: 'YouTube',
    description: 'Public subscriber count for any YouTube channel',
    connection: {
        type: 'apiKey',
        label: 'YouTube Data API key',
        documentationUrl: 'https://console.cloud.google.com/apis/credentials',
    },
    widgets: [
        {
            name: 'channel_stats',
            description: 'Displays the public subscriber count for a channel',
            params: [{ name: 'channel_id', type: 'string' }],
        },
    ],
    validateParams,
    execute,
    async verifyCredentials(credentials: ServiceCredentials) {
        const data = await channelsRequest(
            { part: 'id', id: VERIFICATION_CHANNEL },
            apiKey(credentials),
        );
        if (!data.items?.length) throw new HttpError('YouTube API key could not be verified', 502);
    },
} satisfies ServiceDefinition;
