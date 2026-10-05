import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { FRONTEND, signedInAs, stubFetch } from './helpers.ts';
import app from '../src/app.ts';
import { auth } from '../src/auth.ts';
import { clearCache } from '../src/utils/redisCache.ts';

const prisma = vi.hoisted(() => ({
    account: { findMany: vi.fn() },
    serviceConnection: { findMany: vi.fn() },
    widgetConfig: { findUnique: vi.fn(), create: vi.fn() },
}));
vi.mock('../src/utils/prisma.ts', () => ({ default: prisma }));
const CHANNEL_ID = `UC${'a'.repeat(22)}`;
const payload = {
    serviceName: 'youtube',
    widgetName: 'channel_stats',
    params: { channel_id: CHANNEL_ID },
    refreshRate: 60,
    layout: { x: 0, y: 0, w: 3, h: 2 },
};
const response = (items: unknown[]) => ({ ok: true, status: 200, json: async () => ({ items }) });

beforeEach(async () => {
    vi.clearAllMocks();
    await clearCache();
    signedInAs(7);
    prisma.account.findMany.mockResolvedValue([{ id: 3, accountId: 'google-account' }]);
    prisma.serviceConnection.findMany.mockResolvedValue([]);
    vi.mocked(auth.api.getAccessToken).mockResolvedValue({ accessToken: 'access-token' } as never);
    prisma.widgetConfig.create.mockImplementation(async ({ data }) => ({ id: 9, ...data }));
    prisma.widgetConfig.findUnique.mockResolvedValue({ id: 9, userId: 7, ...payload });
});

const create = (body = payload) => request(app).post('/widgets').set('Origin', FRONTEND).send(body);

describe('YouTube widgets with Better Auth accounts', () => {
    it('requires a signed-in session', async () => {
        vi.mocked(auth.api.getSession).mockResolvedValue(null);
        await create().expect(401);
    });

    it('requires a linked YouTube account and never uses a sign-in account', async () => {
        prisma.account.findMany.mockResolvedValue([]);
        await create().expect(409);
        expect(prisma.account.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 7, providerId: 'youtube-service' } }),
        );
        expect(prisma.widgetConfig.create).not.toHaveBeenCalled();
    });

    it('rejects invalid target IDs before fetching YouTube', async () => {
        const fetch = stubFetch();
        await create({ ...payload, params: { channel_id: 'invalid' } }).expect(400);
        expect(fetch).not.toHaveBeenCalled();
    });

    it.each(['channel_stats', 'latest_videos', 'video_stats'])(
        'creates and reads %s using the account token',
        async (widgetName) => {
            const params =
                widgetName === 'video_stats' ? { video_id: 'abcdefghijk' } : payload.params;
            const config = { ...payload, widgetName, params };
            prisma.widgetConfig.findUnique.mockResolvedValue({ id: 9, userId: 7, ...config });
            const fetch = stubFetch();
            if (widgetName === 'video_stats') {
                fetch.mockResolvedValue(
                    response([
                        {
                            id: 'abcdefghijk',
                            snippet: { title: 'Video' },
                            statistics: { viewCount: '42' },
                        },
                    ]),
                );
            } else if (widgetName === 'latest_videos') {
                fetch
                    .mockResolvedValueOnce(
                        response([
                            {
                                id: CHANNEL_ID,
                                contentDetails: { relatedPlaylists: { uploads: 'UUuploads' } },
                            },
                        ]),
                    )
                    .mockResolvedValueOnce(response([]));
            } else {
                fetch.mockResolvedValue(
                    response([
                        {
                            id: CHANNEL_ID,
                            snippet: { title: 'Our channel' },
                            statistics: { subscriberCount: '1230' },
                        },
                    ]),
                );
            }
            await request(app).post('/widgets').set('Origin', FRONTEND).send(config).expect(201);
            const result = await request(app).get('/widgets/9/data').expect(200);
            expect(result.body).toMatchObject(
                widgetName === 'video_stats'
                    ? { viewCount: 42, likeCount: null }
                    : widgetName === 'latest_videos'
                      ? { videos: [] }
                      : { subscriberCount: 1230 },
            );
            expect(fetch).toHaveBeenCalledTimes(widgetName === 'latest_videos' ? 2 : 1);
            expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer access-token');
            expect(auth.api.getAccessToken).toHaveBeenCalledWith({
                body: { accountId: '3', userId: '7' },
            });
        },
    );

    it('requires selection among multiple accounts and rejects accounts owned by another user', async () => {
        prisma.account.findMany.mockResolvedValue([{ id: 3 }, { id: 4 }]);
        await create().expect(400);
        await request(app)
            .post('/widgets')
            .set('Origin', FRONTEND)
            .send({ ...payload, params: { ...payload.params, account: '99' } })
            .expect(409);
        expect(auth.api.getAccessToken).not.toHaveBeenCalled();
    });

    it('isolates cached results for two linked accounts', async () => {
        prisma.account.findMany.mockResolvedValue([{ id: 3 }, { id: 4 }]);
        const fetch = stubFetch().mockResolvedValue(
            response([{ id: CHANNEL_ID, statistics: { subscriberCount: '10' } }]),
        );
        for (const account of ['3', '4']) {
            await request(app)
                .post('/widgets')
                .set('Origin', FRONTEND)
                .send({ ...payload, params: { ...payload.params, account } })
                .expect(201);
        }
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('reports a token refresh failure from Better Auth', async () => {
        vi.mocked(auth.api.getAccessToken).mockRejectedValue(new Error('refresh refused'));
        const result = await request(app).get('/widgets/9/data').expect(502);
        expect(result.body.error).toMatch(/reconnect/);
    });

    it('reports hidden subscribers at widget creation', async () => {
        stubFetch().mockResolvedValue(
            response([{ id: CHANNEL_ID, statistics: { hiddenSubscriberCount: true } }]),
        );
        const result = await create().expect(409);
        expect(result.body.error).toMatch(/hidden/);
    });

    it('lists and disconnects YouTube accounts through the shared service routes', async () => {
        stubFetch().mockResolvedValue(
            response([{ id: CHANNEL_ID, snippet: { title: 'Our channel' } }]),
        );
        prisma.account.findMany.mockImplementation(async ({ where }) =>
            where.providerId === 'youtube-service' ? [{ id: 3 }] : [],
        );
        const result = await request(app).get('/services').expect(200);
        expect(
            result.body.find((service: { name: string }) => service.name === 'youtube'),
        ).toMatchObject({
            provider: 'youtube-service',
            connected: true,
            accounts: [{ id: 3, login: 'Our channel' }],
        });
        await request(app)
            .delete('/services/youtube/accounts/3')
            .set('Origin', FRONTEND)
            .expect(204);
        expect(auth.api.unlinkAccount).toHaveBeenCalledWith(
            expect.objectContaining({ body: { accountId: '3' } }),
        );
    });
});
