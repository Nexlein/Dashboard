import { createHash } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';
import youtube from '../src/services/youtube.ts';
import { getCache, setCache } from '../src/utils/redisCache.ts';
import { stubFetch } from './helpers.ts';

vi.mock('../src/utils/redisCache.ts', () => ({ getCache: vi.fn(), setCache: vi.fn() }));
const CHANNEL_ID = `UC${'a'.repeat(22)}`;
const context = { userId: 7, cacheScope: '7:key-version', credentials: { apiKey: 'public-key' } };
const response = (items: unknown[]) => Response.json({ items });
let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCache).mockResolvedValue(null);
    fetchMock = stubFetch();
});

it('uses an API key and exposes only public channel subscribers', () => {
    expect(youtube.connection.type).toBe('apiKey');
    expect(youtube.widgets.map((widget) => widget.name)).toEqual(['channel_stats']);
    expect(youtube.widgets[0].params).toEqual([{ name: 'channel_id', type: 'string' }]);
});

it.each(['', 'bad', 'https://youtube.com/@YouTube', '@bad/path'])(
    'rejects invalid target %s before calling Google',
    async (channel_id) => {
        await expect(
            youtube.execute('channel_stats', { channel_id }, context),
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(fetchMock).not.toHaveBeenCalled();
    },
);

it.each(['latest_videos', 'video_stats', 'unknown'])('rejects removed widget %s', async (name) => {
    await expect(youtube.execute(name, { channel_id: CHANNEL_ID }, context)).rejects.toMatchObject({
        statusCode: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
});

it('requires an API key even when a result is cached', async () => {
    vi.mocked(getCache).mockResolvedValue({ subscriberCount: 10 });
    await expect(
        youtube.execute('channel_stats', { channel_id: CHANNEL_ID }, { userId: 7 }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(fetchMock).not.toHaveBeenCalled();
});

it.each([
    [CHANNEL_ID, 'id'],
    ['@YouTube', 'forHandle'],
])('reads public subscribers for %s without OAuth', async (target, selector) => {
    fetchMock.mockResolvedValue(
        response([
            {
                id: CHANNEL_ID,
                snippet: { title: 'Our channel' },
                statistics: { subscriberCount: '1230' },
            },
        ]),
    );
    const result = await youtube.execute('channel_stats', { channel_id: ` ${target} ` }, context);
    expect(result).toEqual({
        channelId: CHANNEL_ID,
        channelTitle: 'Our channel',
        subscriberCount: 1230,
    });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/youtube/v3/channels');
    expect(url.searchParams.get(selector)).toBe(target);
    expect(url.searchParams.get('key')).toBe('public-key');
    expect(url.searchParams.get('part')).toBe('snippet,statistics');
    expect(url.searchParams.has('mine')).toBe(false);
    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
    expect(setCache).toHaveBeenCalledWith(
        `7:key-version:youtube:${createHash('sha256').update('public-key').digest('hex').slice(0, 16)}:channel_stats:${target}`,
        result,
        60000,
    );
    vi.mocked(getCache).mockResolvedValue(result);
    await expect(
        youtube.execute('channel_stats', { channel_id: target }, context),
    ).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledOnce();
});

it('caps caching at five minutes and preserves zero subscribers', async () => {
    fetchMock.mockResolvedValue(
        response([{ id: CHANNEL_ID, statistics: { subscriberCount: '0' } }]),
    );
    const result = await youtube.execute(
        'channel_stats',
        { channel_id: CHANNEL_ID },
        { ...context, refreshRate: 900 },
    );
    expect(result.subscriberCount).toBe(0);
    expect(setCache).toHaveBeenCalledWith(expect.any(String), result, 300000);
});

it.each([
    [[], 404],
    [[{ id: CHANNEL_ID, statistics: { hiddenSubscriberCount: true } }], 409],
    [[{ id: CHANNEL_ID, statistics: { subscriberCount: '-1' } }], 502],
    [[{ id: CHANNEL_ID, statistics: { subscriberCount: '9007199254740992' } }], 502],
])('reports unavailable or malformed channel data', async (items, statusCode) => {
    fetchMock.mockResolvedValue(response(items));
    await expect(
        youtube.execute('channel_stats', { channel_id: CHANNEL_ID }, context),
    ).rejects.toMatchObject({ statusCode });
    expect(setCache).not.toHaveBeenCalled();
});

it('verifies the key against a public channel without caching or OAuth', async () => {
    fetchMock.mockResolvedValue(response([{ id: CHANNEL_ID }]));
    await youtube.verifyCredentials({ apiKey: ' key ' });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('key')).toBe('key');
    expect(url.searchParams.get('part')).toBe('id');
    expect(url.searchParams.get('id')).toBeTruthy();
    expect(url.searchParams.has('mine')).toBe(false);
    expect(setCache).not.toHaveBeenCalled();
});

it.each([
    [400, 'keyInvalid', 400],
    [403, 'forbidden', 400],
    [403, 'accessNotConfigured', 400],
    [403, 'quotaExceeded', 429],
    [429, '', 429],
    [500, '', 502],
])(
    'handles Google status %s and reason %s without leaking the key',
    async (status, reason, statusCode) => {
        fetchMock.mockResolvedValue(
            Response.json(
                { error: { message: 'secret public-key', errors: [{ reason }] } },
                { status },
            ),
        );
        await expect(youtube.verifyCredentials(context.credentials)).rejects.toMatchObject({
            statusCode,
            message: expect.not.stringContaining('public-key'),
        });
    },
);

it('reports network errors and malformed responses', async () => {
    fetchMock.mockRejectedValueOnce(new Error('private URL with public-key'));
    await expect(youtube.verifyCredentials(context.credentials)).rejects.toMatchObject({
        statusCode: 502,
        message: 'YouTube is unavailable',
    });
    fetchMock.mockResolvedValueOnce(Response.json({}));
    await expect(youtube.verifyCredentials(context.credentials)).rejects.toMatchObject({
        statusCode: 502,
    });
});
