import { youtubeVideoId } from 'shared/youtube';

export function youtubeThumbnailUrl(videoUrl: unknown): string | undefined {
    const id = youtubeVideoId(videoUrl);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined;
}
