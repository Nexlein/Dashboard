import { youtubeVideoId } from 'shared/youtube';
import { HttpError } from '../utils/httpError.ts';
import type { ServiceDefinition, WidgetParams } from './types.ts';

export default {
    name: 'youtube',
    displayName: 'YouTube',
    description: 'Play a YouTube video from its link — no API key required',
    widgets: [
        {
            name: 'video_player',
            description: 'Embeds a YouTube video player without credentials',
            params: [{ name: 'video_url', type: 'string' }],
        },
    ],
    validateParams(widgetName: string, params: WidgetParams) {
        if (widgetName !== 'video_player') throw new HttpError('Unsupported YouTube widget', 400);
        if (!youtubeVideoId(params.video_url))
            throw new HttpError('Enter a valid YouTube video link', 400);
    },
} satisfies ServiceDefinition;
