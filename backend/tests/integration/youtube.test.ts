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
