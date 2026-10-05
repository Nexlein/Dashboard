import { vi, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import youtube from '../src/services/youtube.ts';
import { getCache, setCache } from '../src/utils/redisCache.ts';
import { stubFetch } from './helpers.ts';
vi.mock('../src/utils/redisCache.ts', () => ({ getCache: vi.fn(), setCache: vi.fn() }));
let fetchMock: Mock;
const CHANNEL_ID = `UC${'a'.repeat(22)}`;
const VIDEO_ID = 'abcdefghijk';
const context = () => ({ userId: 7, cacheScope: '7:3', credentials: { accessToken: 'token' } });
const response = (items: unknown[]) => ({ ok: true, status: 200, json: async () => ({ items }) });
const channel = {
    id: CHANNEL_ID,
    snippet: { title: 'Our channel' },
    contentDetails: { relatedPlaylists: { uploads: 'UUuploads' } },
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCache).mockResolvedValue(null);
    fetchMock = stubFetch();
});
afterEach(() => vi.restoreAllMocks());

it('exposes exactly three YouTube widget types', () => {
    expect(youtube.widgets.map((widget) => widget.name)).toEqual([
        'channel_stats',
        'latest_videos',
        'video_stats',
    ]);
});

it.each([
    ['latest_videos', { channel_id: 'bad' }],
    ['video_stats', { video_id: 'https://youtube.com/watch?v=abcdefghijk' }],
    ['video_stats', { video_id: '' }],
    ['unknown', {}],
])('rejects invalid configuration for %s without an API request', async (name, params) => {
    await expect(youtube.execute(name, params, context())).rejects.toMatchObject({
        statusCode: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
});

it.each(['latest_videos', 'video_stats'])('requires a connection for %s', async (name) => {
    await expect(
        youtube.execute(name, { channel_id: CHANNEL_ID, video_id: VIDEO_ID }, { userId: 7 }),
    ).rejects.toMatchObject({ statusCode: 409 });
});

it('reads the uploads playlist, keeps publication order and skips unavailable videos', async () => {
    fetchMock.mockResolvedValueOnce(response([channel])).mockResolvedValueOnce(
        response([
            {
                contentDetails: { videoId: VIDEO_ID, videoPublishedAt: '2026-10-01T12:00:00Z' },
                snippet: { title: 'Newest' },
                status: { privacyStatus: 'public' },
            },
            {
                contentDetails: {
                    videoId: 'lmnopqrstuv',
                    videoPublishedAt: '2026-09-01T12:00:00Z',
                },
                snippet: { title: 'Older' },
            },
            {
                contentDetails: {
                    videoId: 'privateabcd',
                    videoPublishedAt: '2026-10-01T12:00:00Z',
                },
                status: { privacyStatus: 'private' },
            },
            { contentDetails: { videoId: 'deletedabcd' }, snippet: { title: 'Deleted video' } },
        ]),
    );
    const result = await youtube.execute('latest_videos', { channel_id: CHANNEL_ID }, context());
    expect(
        ((result as Record<string, unknown>).videos as { title: string }[]).map(
            (video) => video.title,
        ),
    ).toEqual(['Newest', 'Older']);
    const url = new URL(fetchMock.mock.calls[1][0]);
    expect(url.pathname).toBe('/youtube/v3/playlistItems');
    expect(url.searchParams.get('playlistId')).toBe('UUuploads');
    expect(url.searchParams.get('maxResults')).toBe('5');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer token');
    expect(setCache).toHaveBeenCalledWith(`7:3:youtube:latest_videos:${CHANNEL_ID}`, result, 60000);
});

it('returns an empty list for a channel without uploads', async () => {
    fetchMock.mockResolvedValueOnce(response([channel])).mockResolvedValueOnce(response([]));
    await expect(
        youtube.execute('latest_videos', { channel_id: CHANNEL_ID }, context()),
    ).resolves.toMatchObject({ videos: [] });
});

it('reports missing channels and uploads playlists', async () => {
    fetchMock.mockResolvedValueOnce(response([]));
    await expect(
        youtube.execute('latest_videos', { channel_id: CHANNEL_ID }, context()),
    ).rejects.toMatchObject({ statusCode: 404 });
    fetchMock.mockResolvedValueOnce(response([{ id: CHANNEL_ID }]));
    await expect(
        youtube.execute('latest_videos', { channel_id: CHANNEL_ID }, context()),
    ).rejects.toMatchObject({ statusCode: 404 });
});

it('distinguishes unavailable counters from zero and caches video statistics', async () => {
    fetchMock.mockResolvedValueOnce(
        response([
            {
                id: VIDEO_ID,
                snippet: { title: 'Video', channelTitle: 'Channel' },
                statistics: { viewCount: '1200', likeCount: '0' },
            },
        ]),
    );
    const result = await youtube.execute(
        'video_stats',
        { video_id: VIDEO_ID },
        { ...context(), refreshRate: 900 },
    );
    expect(result).toEqual({
        videoId: VIDEO_ID,
        title: 'Video',
        channelTitle: 'Channel',
        viewCount: 1200,
        likeCount: 0,
        commentCount: null,
    });
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe('/youtube/v3/videos');
    expect(setCache).toHaveBeenCalledWith(`7:3:youtube:video_stats:${VIDEO_ID}`, result, 300000);
    vi.mocked(getCache).mockResolvedValueOnce(result);
    await expect(
        youtube.execute('video_stats', { video_id: VIDEO_ID }, context()),
    ).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('reports missing videos and rejects malformed counters without caching', async () => {
    fetchMock.mockResolvedValueOnce(response([]));
    await expect(
        youtube.execute('video_stats', { video_id: VIDEO_ID }, context()),
    ).rejects.toMatchObject({ statusCode: 404 });
    fetchMock.mockResolvedValueOnce(response([{ id: VIDEO_ID, statistics: { viewCount: '-1' } }]));
    await expect(
        youtube.execute('video_stats', { video_id: VIDEO_ID }, context()),
    ).rejects.toMatchObject({ statusCode: 502 });
    expect(setCache).not.toHaveBeenCalled();
});

it.each([
    [401, 409],
    [403, 502],
    [500, 502],
])('handles upstream status %s', async (status, statusCode) => {
    fetchMock.mockResolvedValueOnce({ ok: false, status });
    await expect(
        youtube.execute('video_stats', { video_id: VIDEO_ID }, context()),
    ).rejects.toMatchObject({ statusCode });
    expect(setCache).not.toHaveBeenCalled();
});

it('handles network and malformed JSON responses', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    await expect(
        youtube.execute('video_stats', { video_id: VIDEO_ID }, context()),
    ).rejects.toMatchObject({ statusCode: 502 });
    fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => {
            throw new Error('invalid json');
        },
    });
    await expect(
        youtube.execute('video_stats', { video_id: VIDEO_ID }, context()),
    ).rejects.toMatchObject({ statusCode: 502 });
});
