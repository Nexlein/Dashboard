import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { youtubeWatch, parseYouTubeFeed } from '../src/services/youtubeFeed.ts';
import { clearCache } from '../src/utils/redisCache.ts';
import { stubFetch } from './helpers.ts';

const channel = 'UC_x5XG1OV2P6uZZ5FSM9Ttw';
const other = 'UC1234567890123456789012';
const context = { userId: 7 };
function feed(id = channel, video = 'M7lc1UVf-VE', date = '2026-10-01T10:00:00Z') {
    return `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><yt:channelId>${id.slice(2)}</yt:channelId><title>Channel &amp; friends</title><entry><yt:videoId>${video}</yt:videoId><title>News &amp; updates</title><published>${date}</published><link href="https://evil.example/"/></entry></feed>`;
}
beforeEach(async () => {
    await clearCache();
});
afterEach(() => vi.useRealTimers());

it('parses XML entities and builds canonical links instead of trusting feed URLs', () => {
    const result = parseYouTubeFeed(feed(), channel);
    expect(result.title).toBe('Channel & friends');
    expect(result.videos[0]).toMatchObject({
        title: 'News & updates',
        url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
        thumbnail: 'https://i.ytimg.com/vi/M7lc1UVf-VE/mqdefault.jpg',
    });
    expect(parseYouTubeFeed(feed(channel, 'invalid', 'bad date'), channel).videos).toEqual([]);
});

it.each([
    '<!DOCTYPE x [<!ENTITY y "bad">]><feed/>',
    '<feed>',
    feed(other),
    '<html><body>Consent</body></html>',
])('rejects invalid XML or channel mismatches', (xml) => {
    expect(() => parseYouTubeFeed(xml, channel)).toThrow();
});

it('merges and sorts public feeds and keeps other channels when one is unavailable', async () => {
    const fetch = stubFetch().mockImplementation(async (url: string) =>
        url.includes(other) ? new Response('', { status: 404 }) : new Response(feed()),
    );
    const result = await youtubeWatch({ channels: `${channel}\n${other}` }, context);
    expect(result.videos).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({ channel: other, message: 'Channel not found' });
    expect(fetch).toHaveBeenCalledWith(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`,
        expect.objectContaining({ redirect: 'error', signal: expect.any(AbortSignal) }),
    );
});

it('sorts newest first and shares channel caches across widgets', async () => {
    const fetch = stubFetch().mockImplementation(
        async (url: string) =>
            new Response(
                url.includes(other) ? feed(other, 'dQw4w9WgXcQ', '2026-10-06T10:00:00Z') : feed(),
            ),
    );
    const result = await youtubeWatch({ channels: `${channel}\n${other}` }, context);
    expect(result.videos.map((video) => video.id)).toEqual(['dQw4w9WgXcQ', 'M7lc1UVf-VE']);
    await youtubeWatch({ channels: channel }, { userId: 8 });
    expect(fetch).toHaveBeenCalledTimes(2);
});

it('resolves a handle using channel metadata and deduplicates its feed against a channel ID', async () => {
    const fetch = stubFetch().mockImplementation(
        async (url: string) =>
            new Response(
                url.includes('/feeds/')
                    ? feed()
                    : `{"channelMetadataRenderer":{"externalId":"${channel}"}}`,
            ),
    );
    const result = await youtubeWatch({ channels: `@GoogleDevelopers\n${channel}` }, context);
    expect(result.channels).toHaveLength(1);
    expect(result.videos).toHaveLength(1);
    await youtubeWatch({ channels: '@GoogleDevelopers' }, context);
    expect(fetch).toHaveBeenCalledTimes(2);
});

it('refreshes after 10 minutes, allows manual refresh after a minute and falls back on saved data', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
    const fetch = stubFetch().mockResolvedValue(new Response(feed()));
    await youtubeWatch({ channels: channel }, context);
    await youtubeWatch({ channels: channel }, { ...context, forceRefresh: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date('2026-10-06T12:01:01Z'));
    fetch.mockResolvedValueOnce(new Response(feed()));
    await youtubeWatch({ channels: channel }, { ...context, forceRefresh: true });
    expect(fetch).toHaveBeenCalledTimes(2);
    vi.setSystemTime(new Date('2026-10-06T12:12:00Z'));
    fetch.mockRejectedValueOnce(new Error('offline'));
    const result = await youtubeWatch({ channels: channel }, context);
    expect(result.videos).toHaveLength(1);
    expect(result.warnings[0].message).toContain('saved publications');
    await youtubeWatch({ channels: channel }, { ...context, forceRefresh: true });
    expect(fetch).toHaveBeenCalledTimes(3);
});

it('rejects unsafe configuration without making any network request', async () => {
    const fetch = stubFetch();
    await expect(
        youtubeWatch({ channels: 'http://localhost/private' }, context),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(fetch).not.toHaveBeenCalled();
});

it('rejects oversized feeds and reports an unavailable channel', async () => {
    stubFetch().mockResolvedValue(new Response('x'.repeat(1_000_001)));
    const result = await youtubeWatch({ channels: channel }, context);
    expect(result.videos).toEqual([]);
    expect(result.warnings[0].message).toContain('too large');
});
