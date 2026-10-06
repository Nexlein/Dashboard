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

/** One to five public channel IDs, handles or links; normalized before any network request. */
export function youtubeChannels(value: unknown): string[] | null {
    if (typeof value !== 'string' || value.length > 2048) return null;
    const channels = new Set<string>();
    for (const part of value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)) {
        let input = part;
        if (/^https?:\/\//i.test(input)) {
            let url: URL;
            try {
                url = new URL(input);
            } catch {
                return null;
            }
            if (
                !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(
                    url.hostname,
                ) ||
                url.username ||
                url.password ||
                url.port
            )
                return null;
            let path: string;
            try {
                path = decodeURIComponent(url.pathname);
            } catch {
                return null;
            }
            const match = path.match(
                /^\/(?:channel\/(UC[A-Za-z0-9_-]{22})|(@[\p{L}\p{N}\p{M}_.-]{1,100}))(?:\/(?:videos|shorts|streams|featured))?\/?$/u,
            );
            if (!match) return null;
            input = match[1] || match[2];
        }
        if (/^UC[A-Za-z0-9_-]{22}$/.test(input)) channels.add(input);
        else if (/^@[\p{L}\p{N}\p{M}_.-]{1,100}$/u.test(input)) channels.add(input.toLowerCase());
        else return null;
    }
    return channels.size >= 1 && channels.size <= 5 ? [...channels] : null;
}
