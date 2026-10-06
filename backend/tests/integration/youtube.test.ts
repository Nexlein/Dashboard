import { expect, it, vi } from 'vitest';
import prisma from '../../src/utils/prisma.ts';
import { decryptJson } from '../../src/utils/encryption.ts';
import { browser, FRONTEND, registerVerified, userByEmail } from './helpers.ts';

it('saves a verified YouTube API key and reads a public channel without Google OAuth', async () => {
    const agent = browser();
    const email = await registerVerified(agent);
    const channelId = `UC${'a'.repeat(22)}`;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
        const url = new URL(String(input instanceof Request ? input.url : input));
        expect(url.origin).toBe('https://www.googleapis.com');
        expect(url.pathname).toBe('/youtube/v3/channels');
        expect(url.searchParams.get('key')).toBe('youtube-public-key');
        expect(url.searchParams.has('mine')).toBe(false);
        return Response.json({
            items: [
                {
                    id: channelId,
                    snippet: { title: 'Public channel' },
                    statistics: { subscriberCount: '1230' },
                },
            ],
        });
    });
    vi.stubGlobal('fetch', fetchMock);
    const saved = await agent
        .put('/services/youtube/connection')
        .set('Origin', FRONTEND)
        .send({ apiKey: 'youtube-public-key' })
        .expect(200);
    expect(saved.body.keyHint).toBe('-key');
    const user = await userByEmail(email);
    const connection = await prisma.serviceConnection.findUnique({
        where: { userId_serviceName: { userId: user!.id, serviceName: 'youtube' } },
    });
    expect(decryptJson(connection!.encryptedCredentials)).toEqual({ apiKey: 'youtube-public-key' });
    expect(JSON.stringify(connection!.encryptedCredentials)).not.toContain('youtube-public-key');
    expect(user!.accounts.some((account) => account.providerId === 'youtube-service')).toBe(false);
    const widget = await agent
        .post('/widgets')
        .set('Origin', FRONTEND)
        .send({
            serviceName: 'youtube',
            widgetName: 'channel_stats',
            params: { channel_id: '@YouTube' },
            refreshRate: 60,
            layout: { x: 0, y: 0, w: 3, h: 2 },
        })
        .expect(201);
    const data = await agent.get(`/widgets/${widget.body.id}/data`).expect(200);
    expect(data.body).toMatchObject({
        channelId,
        channelTitle: 'Public channel',
        subscriberCount: 1230,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const calls = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    expect(calls[1].searchParams.get('forHandle')).toBe('@YouTube');
    await agent.delete('/services/youtube/connection').set('Origin', FRONTEND).expect(204);
    await agent.get(`/widgets/${widget.body.id}/data`).expect(409);
    expect(
        await prisma.serviceConnection.findUnique({
            where: { userId_serviceName: { userId: user!.id, serviceName: 'youtube' } },
        }),
    ).toBeNull();
});

it('rejects an invalid YouTube key without creating a connection', async () => {
    const agent = browser();
    const email = await registerVerified(agent);
    vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
            Response.json({ error: { errors: [{ reason: 'keyInvalid' }] } }, { status: 400 }),
        ),
    );
    await agent
        .put('/services/youtube/connection')
        .set('Origin', FRONTEND)
        .send({ apiKey: 'bad-key' })
        .expect(400);
    const user = await userByEmail(email);
    expect(
        await prisma.serviceConnection.findUnique({
            where: { userId_serviceName: { userId: user!.id, serviceName: 'youtube' } },
        }),
    ).toBeNull();
});
