import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { FRONTEND, signedInAs, stubFetch } from './helpers.ts';
import app from '../src/app.ts';
import { auth } from '../src/auth.ts';
import { encryptJson } from '../src/utils/encryption.ts';

const prisma = vi.hoisted(() => ({
    account: { findMany: vi.fn() },
    serviceConnection: { findMany: vi.fn(), findUnique: vi.fn() },
    widgetConfig: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock('../src/utils/prisma.ts', () => ({ default: prisma }));
const payload = {
    serviceName: 'youtube',
    widgetName: 'video_player',
    params: { video_url: 'https://youtu.be/M7lc1UVf-VE' },
    refreshRate: 60,
    layout: { x: 0, y: 0, w: 4, h: 4 },
};

beforeEach(() => {
    vi.clearAllMocks();
    signedInAs(7);
    prisma.account.findMany.mockResolvedValue([]);
    prisma.serviceConnection.findMany.mockResolvedValue([]);
    prisma.widgetConfig.create.mockImplementation(async ({ data }) => ({ id: 9, ...data }));
    prisma.widgetConfig.findUnique.mockResolvedValue({
        id: 9,
        userId: 7,
        ...payload,
        params: encryptJson(payload.params),
    });
    prisma.widgetConfig.update.mockImplementation(async ({ data }) => ({
        id: 9,
        userId: 7,
        ...payload,
        ...data,
    }));
});

const create = (body = payload) => request(app).post('/widgets').set('Origin', FRONTEND).send(body);

describe('YouTube video player without credentials', () => {
    it('publishes only the video player and its link parameter in about.json', async () => {
        const result = await request(app).get('/about.json').expect(200);
        expect(
            result.body.server.services.find(
                (service: { name: string }) => service.name === 'youtube',
            ),
        ).toEqual({
            name: 'youtube',
            widgets: [
                {
                    name: 'video_player',
                    description: 'Embeds a YouTube video player without credentials',
                    params: [{ name: 'video_url', type: 'string' }],
                },
            ],
        });
    });

    it('requires only a Dashboard session to save the widget', async () => {
        vi.mocked(auth.api.getSession).mockResolvedValue(null);
        await create().expect(401);
    });

    it('creates the player without stored keys, Google accounts or provider requests', async () => {
        const fetch = stubFetch();
        const result = await create().expect(201);
        expect(result.body).toMatchObject({ widgetName: 'video_player', params: payload.params });
        expect(prisma.serviceConnection.findUnique).not.toHaveBeenCalled();
        expect(prisma.account.findMany).not.toHaveBeenCalled();
        expect(auth.api.getAccessToken).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it.each([
        'https://evil.example/watch?v=M7lc1UVf-VE',
        'javascript:alert(1)',
        'https://youtube.com/playlist?list=PLexample',
        '',
    ])('rejects invalid video link %s', async (video_url) => {
        await create({ ...payload, params: { video_url } }).expect(400);
        expect(prisma.widgetConfig.create).not.toHaveBeenCalled();
    });

    it.each(['channel_stats', 'latest_videos', 'video_stats'])(
        'no longer offers %s',
        async (widgetName) => {
            await create({ ...payload, widgetName }).expect(400);
        },
    );

    it('validates replacement links when editing the widget', async () => {
        await request(app)
            .put('/widgets/9')
            .set('Origin', FRONTEND)
            .send({ params: { video_url: 'https://evil.example/video' } })
            .expect(400);
        expect(prisma.widgetConfig.update).not.toHaveBeenCalled();
        const result = await request(app)
            .put('/widgets/9')
            .set('Origin', FRONTEND)
            .send({ params: { video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
            .expect(200);
        expect(result.body.params.video_url).toContain('dQw4w9WgXcQ');
    });

    it('reports YouTube as available without any configuration', async () => {
        const result = await request(app).get('/services').expect(200);
        const youtube = result.body.find((service: { name: string }) => service.name === 'youtube');
        expect(youtube).toMatchObject({
            connected: true,
            configurable: false,
            connectionType: null,
            credentialLabel: null,
        });
        await request(app)
            .put('/services/youtube/connection')
            .set('Origin', FRONTEND)
            .send({ apiKey: 'unused' })
            .expect(400);
    });
});
