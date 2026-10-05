export default {
    name: 'youtube',
    widgets: [
        {
            name: 'channel_stats',
            description: 'Displays subscriber count and total views for a channel',
            params: [{ name: 'channel_id', type: 'string' }],
        },
        {
            name: 'latest_video',
            description: 'Displays the most recent video from a channel',
            params: [{ name: 'channel_id', type: 'string' }],
        },
    ],
};
