import { youtubeChannels, youtubeVideoId } from 'shared/youtube';
import { youtubeWatch } from './youtubeFeed.ts';
import { HttpError } from '../utils/httpError.ts';
import type { ServiceDefinition, WidgetParams } from './types.ts';

export default {
    name: 'youtube',
    displayName: 'YouTube',
    description: 'Videos and a public channel watch feed — no API key required',
    widgets: [
        {
            name: 'video_player',
            description: 'Embeds a YouTube video player without credentials',
            params: [{ name: 'video_url', type: 'string' }],
        },
        {
            name: 'channel_watch',
            description: 'Latest publications from up to five public YouTube channels',
            params: [{ name: 'channels', type: 'string' }],
        },
    ],
    validateParams(widgetName: string, params: WidgetParams) {
        if (widgetName === 'channel_watch') {
            if (!youtubeChannels(params.channels))
                throw new HttpError('Add between 1 and 5 valid YouTube channels', 400);
            return;
        }
        if (widgetName !== 'video_player') throw new HttpError('Unsupported YouTube widget', 400);
        if (!youtubeVideoId(params.video_url))
            throw new HttpError('Enter a valid YouTube video link', 400);
    },
    async execute(widgetName, params, context) {
        if (widgetName !== 'channel_watch')
            throw new HttpError('This widget does not provide feed data', 400);
        return youtubeWatch(params, context);
    },
} satisfies ServiceDefinition;
