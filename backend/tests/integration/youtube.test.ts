import { expect, it, vi } from 'vitest';
import { browser, FRONTEND, registerVerified } from './helpers.ts';

it('creates, edits and reads a YouTube player without any API key or external request', async () => {
    const agent = browser();
    await registerVerified(agent);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const widget = await agent
        .post('/widgets')
        .set('Origin', FRONTEND)
        .send({
            serviceName: 'youtube',
            widgetName: 'video_player',
            params: { video_url: 'https://youtu.be/M7lc1UVf-VE' },
            refreshRate: 60,
            layout: { x: 0, y: 0, w: 4, h: 4 },
        })
        .expect(201);
    const id = widget.body.id;
    await agent
        .put(`/widgets/${id}`)
        .set('Origin', FRONTEND)
        .send({ params: { video_url: 'https://example.com/video' } })
        .expect(400);
    await agent
        .put(`/widgets/${id}`)
        .set('Origin', FRONTEND)
        .send({ params: { video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
        .expect(200);
    const widgets = await agent.get('/widgets').expect(200);
    expect(widgets.body.find((entry: { id: number }) => entry.id === id)).toMatchObject({
        widgetName: 'video_player',
        params: { video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    });
    const services = await agent.get('/services').expect(200);
    expect(services.body.find((entry: { name: string }) => entry.name === 'youtube')).toMatchObject(
        { connected: true, configurable: false },
    );
    expect(fetchMock).not.toHaveBeenCalled();
});

it('creates and loads a multi-channel watch without service credentials', async () => {
    const agent = browser();
    await registerVerified(agent);
    const channels = ['UC_x5XG1OV2P6uZZ5FSM9Ttw', 'UC1234567890123456789012'];
    const fetchMock = vi.fn(async (url: string) => {
        const id = new URL(url).searchParams.get('channel_id');
        return new Response(
            `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><yt:channelId>${id?.slice(2)}</yt:channelId><title>Public channel</title><entry><yt:videoId>${id === channels[0] ? 'M7lc1UVf-VE' : 'dQw4w9WgXcQ'}</yt:videoId><title>Public news</title><published>2026-10-06T10:00:00Z</published></entry></feed>`,
        );
    });
    vi.stubGlobal('fetch', fetchMock);
    const widget = await agent
        .post('/widgets')
        .set('Origin', FRONTEND)
        .send({
            serviceName: 'youtube',
            widgetName: 'channel_watch',
            params: { channels: channels.join('\n') },
            refreshRate: 60,
            layout: { x: 0, y: 0, w: 5, h: 5 },
        })
        .expect(201);
    const data = await agent.get(`/widgets/${widget.body.id}/data`).expect(200);
    expect(data.body.channels).toHaveLength(2);
    expect(data.body.videos).toHaveLength(2);
    expect(data.body.warnings).toEqual([]);
    const requests = fetchMock.mock.calls.length;
    await agent.get(`/widgets/${widget.body.id}/data?refresh=true`).expect(200);
    expect(fetchMock).toHaveBeenCalledTimes(requests);
    await agent
        .put(`/widgets/${widget.body.id}`)
        .set('Origin', FRONTEND)
        .send({ params: { channels: 'https://localhost/private' } })
        .expect(400);
});
