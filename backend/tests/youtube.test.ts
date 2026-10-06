import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { FRONTEND, signedInAs, stubFetch } from './helpers.ts';
import app from '../src/app.ts';
import { auth } from '../src/auth.ts';
import { clearCache } from '../src/utils/redisCache.ts';
import { decryptJson, encryptJson } from '../src/utils/encryption.ts';

const prisma = vi.hoisted(() => ({
    account: { findMany: vi.fn() },
    serviceConnection: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
    },
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
const publicChannel = () =>
    Response.json({
        items: [
            {
                id: CHANNEL_ID,
                snippet: { title: 'Our channel' },
                statistics: { subscriberCount: '1230' },
            },
        ],
    });

beforeEach(async () => {
    vi.clearAllMocks();
    await clearCache();
    signedInAs(7);
    const connection = {
        encryptedCredentials: encryptJson({ apiKey: 'public-key' }),
        verifiedAt: new Date(),
        keyHint: '-key',
    };
    prisma.serviceConnection.findUnique.mockResolvedValue(connection);
    prisma.serviceConnection.findMany.mockResolvedValue([
        { ...connection, serviceName: 'youtube' },
    ]);
    prisma.serviceConnection.upsert.mockImplementation(async ({ create }) => create);
    prisma.account.findMany.mockResolvedValue([]);
    prisma.widgetConfig.create.mockImplementation(async ({ data }) => ({ id: 9, ...data }));
    prisma.widgetConfig.findUnique.mockResolvedValue({
        id: 9,
        userId: 7,
        ...payload,
        params: encryptJson(payload.params),
    });
});

const create = (body = payload) => request(app).post('/widgets').set('Origin', FRONTEND).send(body);
const connect = (apiKey = 'public-key') =>
    request(app).put('/services/youtube/connection').set('Origin', FRONTEND).send({ apiKey });

describe('YouTube public-data service', () => {
    it('still requires a Dashboard session to save a key or widget', async () => {
        vi.mocked(auth.api.getSession).mockResolvedValue(null);
        await connect().expect(401);
        await create().expect(401);
    });

    it('verifies and encrypts the API key without returning it', async () => {
        stubFetch().mockImplementation(async () => publicChannel());
        const result = await connect(' public-key ').expect(200);
        const stored = prisma.serviceConnection.upsert.mock.calls[0][0];
        expect(stored.where).toEqual({ userId_serviceName: { userId: 7, serviceName: 'youtube' } });
        expect(decryptJson(stored.create.encryptedCredentials)).toEqual({ apiKey: 'public-key' });
        expect(stored.create.encryptedCredentials).not.toContain('public-key');
        expect(result.body.keyHint).toBe('-key');
        expect(JSON.stringify(result.body)).not.toContain('public-key');
        expect(auth.api.getAccessToken).not.toHaveBeenCalled();
    });

    it('never saves an invalid key', async () => {
        stubFetch().mockResolvedValue(
            Response.json({ error: { errors: [{ reason: 'keyInvalid' }] } }, { status: 400 }),
        );
        await connect().expect(400);
        expect(prisma.serviceConnection.upsert).not.toHaveBeenCalled();
    });

    it('requires a saved API key and does not fall back to an OAuth account', async () => {
        prisma.serviceConnection.findUnique.mockResolvedValue(null);
        prisma.account.findMany.mockResolvedValue([{ id: 3 }]);
        await create().expect(409);
        expect(prisma.widgetConfig.create).not.toHaveBeenCalled();
        expect(auth.api.getAccessToken).not.toHaveBeenCalled();
    });

    it('creates and reads the subscriber widget without selecting a Google account', async () => {
        const fetch = stubFetch().mockImplementation(async () => publicChannel());
        await create().expect(201);
        const result = await request(app).get('/widgets/9/data').expect(200);
        expect(result.body).toMatchObject({ channelId: CHANNEL_ID, subscriberCount: 1230 });
        expect(fetch).toHaveBeenCalledOnce();
        expect(new URL(fetch.mock.calls[0][0]).searchParams.get('key')).toBe('public-key');
        expect(auth.api.getAccessToken).not.toHaveBeenCalled();
    });

    it('rejects invalid targets and the removed widgets before fetching', async () => {
        const fetch = stubFetch();
        await create({ ...payload, params: { channel_id: 'invalid' } }).expect(400);
        for (const widgetName of ['latest_videos', 'video_stats'])
            await create({ ...payload, widgetName }).expect(400);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('isolates cached responses when the user or key changes', async () => {
        const fetch = stubFetch().mockImplementation(async () => publicChannel());
        await request(app).get('/widgets/9/data').expect(200);
        signedInAs(8);
        prisma.widgetConfig.findUnique.mockResolvedValue({
            id: 9,
            userId: 8,
            ...payload,
            params: encryptJson(payload.params),
        });
        await request(app).get('/widgets/9/data').expect(200);
        prisma.serviceConnection.findUnique.mockResolvedValue({
            encryptedCredentials: encryptJson({ apiKey: 'replacement-key' }),
            verifiedAt: new Date(),
        });
        await request(app).get('/widgets/9/data').expect(200);
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('shows an API key connection and disconnects it without OAuth', async () => {
        const result = await request(app).get('/services').expect(200);
        const youtube = result.body.find((service: { name: string }) => service.name === 'youtube');
        expect(youtube).toMatchObject({
            connected: true,
            connectionType: 'apiKey',
            credentialLabel: 'YouTube Data API key',
            keyHint: '-key',
        });
        expect(youtube).not.toHaveProperty('provider');
        expect(JSON.stringify(youtube)).not.toContain('public-key');
        await request(app)
            .delete('/services/youtube/connection')
            .set('Origin', FRONTEND)
            .expect(204);
        expect(prisma.serviceConnection.deleteMany).toHaveBeenCalledWith({
            where: { userId: 7, serviceName: 'youtube' },
        });
        expect(auth.api.unlinkAccount).not.toHaveBeenCalled();
    });
});
