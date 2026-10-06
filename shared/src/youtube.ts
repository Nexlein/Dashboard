/** Extracts a video ID from a YouTube link; never returns an arbitrary embed URL. */
export function youtubeVideoId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const input = value.trim();
    const validId = (id: string | null) => (id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null);
    if (validId(input)) return input;
    let url: URL;
    try {
        url = new URL(input);
    } catch {
        return null;
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port)
        return null;
    const host = url.hostname;
    if (host === 'youtu.be') return validId(url.pathname.slice(1));
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
        if (url.pathname === '/watch') return validId(url.searchParams.get('v'));
        const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/);
        return match ? match[1] : null;
    }
    if (['youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
        const match = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})\/?$/);
        return match ? match[1] : null;
    }
    return null;
}
