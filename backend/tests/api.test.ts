import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FRONTEND, signedInAs } from './helpers.ts';
import request from 'supertest';
import app from '../src/app.ts';
import stocks from '../src/services/stocks.ts';
import { StockPendingError } from '../src/services/stockProvider.ts';
import weatherService from '../src/services/weather.ts';

// Mock Prisma Client
// The shared client from utils/prisma.ts: plain stubs, hoisted for vi.mock.
const prisma = vi.hoisted(() => ({
    user: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
    widgetConfig: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
    },
    serviceConnection: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
    },
    account: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
}));
vi.mock('../src/utils/prisma.ts', () => ({ default: prisma }));

import { auth } from '../src/auth.ts';
import { encryptJson } from '../src/utils/encryption.ts';
import chatbotService from '../src/services/chatbot.ts';

describe('API Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(auth.api.getSession).mockResolvedValue(null);
    });

    describe('GET /health', () => {
        it('should return 200 and ok status when DB is connected', async () => {
            prisma.$queryRaw.mockResolvedValue([1]);

            const res = await request(app).get('/health');
            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body).toHaveProperty('uptime');
            expect(res.body).toHaveProperty('timestamp');
        });

        it('should return 503 when DB connection fails', async () => {
            prisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

            const res = await request(app).get('/health');
            expect(res.statusCode).toBe(503);
            expect(res.body.status).toBe('error');
            expect(res.body.message).toBe('Database connection failed');
        });
    });

    describe('GET /about.json', () => {
        it('should return valid about.json schema', async () => {
            const res = await request(app).get('/about.json');
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('client');
            expect(res.body.client).toHaveProperty('host');

            expect(res.body).toHaveProperty('server');
            expect(res.body.server).toHaveProperty('current_time');
            expect(res.body.server).toHaveProperty('services');

            // We expect our 4 base services (weather, github, youtube, chatbot)
            expect(Array.isArray(res.body.server.services)).toBe(true);
            expect(res.body.server.services.length).toBeGreaterThanOrEqual(4);

            // Check that the first service has the correct Epitech structure
            const firstService = res.body.server.services[0];
            expect(firstService).toHaveProperty('name');
            expect(firstService).toHaveProperty('widgets');
            expect(Array.isArray(firstService.widgets)).toBe(true);

            if (firstService.widgets.length > 0) {
                const firstWidget = firstService.widgets[0];
                expect(firstWidget).toHaveProperty('name');
                expect(firstWidget).toHaveProperty('description');
                expect(firstWidget).toHaveProperty('params');
                expect(Array.isArray(firstWidget.params)).toBe(true);
            }
        });

        it('allows configured frontend origins through CORS', async () => {
            const res = await request(app)
                .get('/about.json')
                .set('Origin', 'http://localhost:5173');

            expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
        });

        it('does not allow unknown origins through CORS', async () => {
            const res = await request(app)
                .get('/about.json')
                .set('Origin', 'https://malicious.example');

            expect(res.headers['access-control-allow-origin']).toBeUndefined();
        });
    });

    describe('code endpoints rate limit', () => {
        it('limits repeated code checks and code emails like sign-in', async () => {
            for (let attempt = 0; attempt < 20; attempt += 1) {
                await request(app).post('/api/auth/email-otp/verify-email').send({});
            }
            const response = await request(app).post('/api/auth/email-otp/reset-password').send({});

            expect(response.statusCode).toBe(429);
        });
    });

    describe('sign-in rate limit', () => {
        it('limits repeated attempts before they reach Better Auth', async () => {
            for (let attempt = 0; attempt < 20; attempt += 1) {
                await request(app).post('/api/auth/sign-in/email').send({});
            }
            const response = await request(app).post('/api/auth/sign-in/email').send({});

            expect(response.statusCode).toBe(429);
            expect(response.body.error).toBe(
                'Too many authentication attempts. Please try again later.',
            );
        });
    });

    describe('Widget CRUD API', () => {
        beforeEach(() => signedInAs(1));
        const mockWidget = {
            id: 1,
            userId: 1,
            serviceName: 'weather',
            widgetName: 'current_weather',
            params: { city: 'Paris' },
            refreshRate: 60,
            layout: { x: 0, y: 0, w: 2, h: 2 },
        };

        it('should require authentication', async () => {
            vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
            const res = await request(app).get('/widgets');

            expect(res.statusCode).toBe(401);
        });

        it('should create a widget with encrypted params and return the public contract', async () => {
            prisma.serviceConnection.findUnique.mockResolvedValue({
                id: 9,
                encryptedCredentials: encryptJson({ apiKey: 'test' }),
            });
            prisma.widgetConfig.create.mockResolvedValue(mockWidget);
            const executeSpy = vi.spyOn(weatherService, 'execute').mockResolvedValue({});

            const res = await request(app)
                .post('/widgets')
                .set('Origin', FRONTEND)
                .send({
                    serviceName: 'weather',
                    widgetName: 'current_weather',
                    params: { city: 'Paris' },
                    refreshRate: 60,
                    layout: { x: 0, y: 0, w: 2, h: 2 },
                });

            console.log(res.body);
            expect(res.statusCode).toBe(201);
            expect(res.body).toEqual(mockWidget);
            expect(prisma.widgetConfig.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: 1,
                    serviceName: 'weather',
                    widgetName: 'current_weather',
                    params: expect.objectContaining({ _encrypted: true }),
                    refreshRate: 60,
                }),
            });
            executeSpy.mockRestore();
        });

        it('should reject a refresh rate below 60 seconds', async () => {
            const res = await request(app)
                .post('/widgets')
                .set('Origin', FRONTEND)
                .send({
                    serviceName: 'weather',
                    widgetName: 'current_weather',
                    params: { city: 'Paris' },
                    refreshRate: 30,
                    layout: { x: 0, y: 0, w: 2, h: 2 },
                });

            expect(res.statusCode).toBe(400);
            expect(res.statusCode).toBe(400);
            expect(prisma.widgetConfig.create).not.toHaveBeenCalled();
        });

        it('should batch update widget layouts', async () => {
            prisma.$transaction.mockResolvedValue([]);

            const res = await request(app)
                .put('/widgets/layout')
                .set('Origin', FRONTEND)
                .send({
                    layouts: [
                        { id: 1, layout: { x: 0, y: 0, w: 4, h: 4 } },
                        { id: 2, layout: { x: 4, y: 0, w: 4, h: 2 } },
                    ],
                });

            expect(res.statusCode).toBe(204);
            expect(prisma.$transaction).toHaveBeenCalled();
        });

        it('should execute a configured weather widget for its owner', async () => {
            prisma.widgetConfig.findUnique.mockResolvedValue(mockWidget);
            prisma.serviceConnection.findUnique.mockResolvedValue({
                id: 9,
                userId: 1,
                serviceName: 'weather',
                encryptedCredentials: { apiKey: 'test-key' },
            });
            const execute = vi.spyOn(weatherService, 'execute').mockResolvedValue({
                type: 'current_weather',
                temperature: 19,
            });

            const res = await request(app).get('/widgets/1/data').set('Origin', FRONTEND);

            expect(res.statusCode).toBe(200);
            expect(res.body.temperature).toBe(19);
            expect(execute).toHaveBeenCalledWith(
                'current_weather',
                { city: 'Paris' },
                {
                    userId: 1,
                    refreshRate: 60,
                    credentials: { apiKey: 'test-key' },
                    cacheScope: '1:9',
                },
            );
            execute.mockRestore();
        });

        it('creates an eight-stock configuration without fetching market data twice', async () => {
            prisma.serviceConnection.findUnique.mockResolvedValue({
                id: 9,
                encryptedCredentials: encryptJson({ apiKey: 'test-key' }),
            });
            prisma.widgetConfig.create.mockResolvedValue({
                ...mockWidget,
                serviceName: 'stocks',
                widgetName: 'stock_market',
            });
            const execute = vi.spyOn(stocks, 'execute');
            try {
                const res = await request(app)
                    .post('/widgets')
                    .set('Origin', FRONTEND)
                    .send({
                        serviceName: 'stocks',
                        widgetName: 'stock_market',
                        params: {
                            symbols: 'AAPL,MSFT,NVDA,TSLA,AMZN,GOOG,META,NFLX',
                            period: '1M',
                        },
                        refreshRate: 60,
                        layout: { x: 0, y: 0, w: 6, h: 5 },
                    });
                expect(res.statusCode).toBe(201);
                expect(execute).not.toHaveBeenCalled();
                expect(prisma.widgetConfig.create).toHaveBeenCalled();
            } finally {
                execute.mockRestore();
            }
        });

        it('keeps local stock validation when creation no longer calls the provider', async () => {
            prisma.serviceConnection.findUnique.mockResolvedValue({
                id: 9,
                encryptedCredentials: encryptJson({ apiKey: 'test-key' }),
            });
            const res = await request(app)
                .post('/widgets')
                .set('Origin', FRONTEND)
                .send({
                    serviceName: 'stocks',
                    widgetName: 'stock_profile',
                    params: { symbols: 'AAPL,MSFT', period: '1M' },
                    refreshRate: 60,
                    layout: { x: 0, y: 0, w: 4, h: 4 },
                });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('exactly one company');
            expect(prisma.widgetConfig.create).not.toHaveBeenCalled();
        });

        it('returns provider cooldown information for automatic stock retries', async () => {
            prisma.widgetConfig.findUnique.mockResolvedValue({
                ...mockWidget,
                serviceName: 'stocks',
                widgetName: 'stock_market',
                params: { symbols: 'AAPL', period: '1M' },
            });
            prisma.serviceConnection.findUnique.mockResolvedValue({
                id: 9,
                encryptedCredentials: encryptJson({ apiKey: 'test-key' }),
            });
            const execute = vi
                .spyOn(stocks, 'execute')
                .mockRejectedValue(new StockPendingError(Date.now() + 45000));
            try {
                const res = await request(app).get('/widgets/1/data').set('Origin', FRONTEND);
                expect(res.statusCode).toBe(429);
                expect(Number(res.headers['retry-after'])).toBeGreaterThanOrEqual(44);
                expect(res.body.retryAfter).toBeGreaterThanOrEqual(44);
            } finally {
                execute.mockRestore();
            }
        });

        it('answers 501 for a widget whose service fetches no data', async () => {
            prisma.widgetConfig.findUnique.mockResolvedValue({
                ...mockWidget,
                serviceName: 'youtube',
                widgetName: 'channel_stats',
                params: {},
            });

            const res = await request(app).get('/widgets/1/data').set('Origin', FRONTEND);

            expect(res.statusCode).toBe(501);
            expect(res.body.error).toBe('Widget data is not available for this service');
        });

        it('requires the user to connect OpenWeather before creating a weather widget', async () => {
            prisma.serviceConnection.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .post('/widgets')
                .set('Origin', FRONTEND)
                .send({
                    serviceName: 'weather',
                    widgetName: 'current_weather',
                    params: { city: 'Paris' },
                    refreshRate: 60,
                    layout: { x: 0, y: 0, w: 3, h: 2 },
                });

            expect(res.statusCode).toBe(409);
            expect(res.body.error).toMatch(/OpenWeather is not connected/);
            expect(prisma.widgetConfig.create).not.toHaveBeenCalled();
        });

        it.each([
            ['get', '/widgets/abc/data'],
            ['put', '/widgets/abc'],
            ['delete', '/widgets/abc'],
            ['post', '/widgets/abc/chat'],
            ['delete', '/widgets/0'],
            ['put', '/widgets/1.5'],
        ] as const)('rejects an invalid widget id on %s %s', async (method, url) => {
            const res = await request(app)[method](url).set('Origin', FRONTEND).send({});

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Invalid widget id');
            expect(prisma.widgetConfig.findUnique).not.toHaveBeenCalled();
        });

        it.each([
            [{ refreshRate: 30 }],
            [{ refreshRate: '120' }],
            [{ params: 'city=Paris' }],
            [{ layout: { x: 'left', y: 0, w: 2, h: 2 } }],
        ])('rejects an invalid widget update %j', async (body) => {
            const res = await request(app).put('/widgets/1').set('Origin', FRONTEND).send(body);

            expect(res.statusCode).toBe(400);
            expect(prisma.widgetConfig.update).not.toHaveBeenCalled();
        });

        it('updates a widget owned by the user', async () => {
            prisma.widgetConfig.findUnique.mockResolvedValue(mockWidget);
            prisma.widgetConfig.update.mockImplementation(({ data }) =>
                Promise.resolve({ ...mockWidget, ...data }),
            );

            const res = await request(app)
                .put('/widgets/1')
                .set('Origin', FRONTEND)
                .send({ params: { city: 'Lyon' }, refreshRate: 120 });

            expect(res.statusCode).toBe(200);
            expect(res.body.params).toEqual({ city: 'Lyon' });
            expect(res.body.refreshRate).toBe(120);
        });

        it("refuses to delete another user's widget", async () => {
            prisma.widgetConfig.findUnique.mockResolvedValue({ ...mockWidget, userId: 2 });

            const res = await request(app).delete('/widgets/1').set('Origin', FRONTEND);

            expect(res.statusCode).toBe(403);
            expect(prisma.widgetConfig.delete).not.toHaveBeenCalled();
        });

        describe('POST /widgets/:id/chat', () => {
            const chatWidget = {
                ...mockWidget,
                serviceName: 'chatbot',
                widgetName: 'ai_chat',
                params: { model: 'llama3.2:1b' },
            };
            const messages = [{ role: 'user', content: 'Hello' }];

            it('forwards the conversation to the chatbot service', async () => {
                prisma.widgetConfig.findUnique.mockResolvedValue(chatWidget);
                const chat = vi
                    .spyOn(chatbotService, 'chat')
                    .mockResolvedValue({ reply: 'Hi there' });

                const res = await request(app)
                    .post('/widgets/1/chat')
                    .set('Origin', FRONTEND)
                    .send({ messages });

                expect(res.statusCode).toBe(200);
                expect(res.body).toEqual({ reply: 'Hi there' });
                expect(chat).toHaveBeenCalledWith(
                    { model: 'llama3.2:1b' },
                    { userId: 1 },
                    messages,
                );
                chat.mockRestore();
            });

            it('keeps the status code of chatbot errors', async () => {
                prisma.widgetConfig.findUnique.mockResolvedValue(chatWidget);
                const error = Object.assign(new Error('Ollama API Error: Not Found'), {
                    statusCode: 404,
                });
                const chat = vi.spyOn(chatbotService, 'chat').mockRejectedValue(error);

                const res = await request(app)
                    .post('/widgets/1/chat')
                    .set('Origin', FRONTEND)
                    .send({ messages });

                expect(res.statusCode).toBe(404);
                expect(res.body.error).toBe('Ollama API Error: Not Found');
                chat.mockRestore();
            });

            it.each([
                [{}],
                [{ messages: 'Hello' }],
                [{ messages: [{ role: 'hacker', content: 'x' }] }],
                [{ messages: [{ role: 'user' }] }],
            ])('rejects an invalid chat payload %j', async (body) => {
                const res = await request(app)
                    .post('/widgets/1/chat')
                    .set('Origin', FRONTEND)
                    .send(body);

                expect(res.statusCode).toBe(400);
                expect(prisma.widgetConfig.findUnique).not.toHaveBeenCalled();
            });

            it('rejects chat on a widget that is not a chatbot', async () => {
                prisma.widgetConfig.findUnique.mockResolvedValue(mockWidget);

                const res = await request(app)
                    .post('/widgets/1/chat')
                    .set('Origin', FRONTEND)
                    .send({ messages });

                expect(res.statusCode).toBe(400);
            });
        });
    });

    describe('Service connections API', () => {
        beforeEach(() => signedInAs(1));
        const verifiedAt = new Date('2026-09-21T12:00:00.000Z');
        const connection = {
            id: 9,
            userId: 1,
            serviceName: 'weather',
            encryptedCredentials: { hidden: true },
            keyHint: 't-key',
            verifiedAt,
        };

        it('lists services without exposing credentials', async () => {
            prisma.serviceConnection.findMany.mockResolvedValue([connection]);
            prisma.account.findMany.mockResolvedValue([]);

            const res = await request(app).get('/services').set('Origin', FRONTEND);

            expect(res.statusCode).toBe(200);
            const weather = res.body.find(
                (service: { name: string }) => service.name === 'weather',
            );
            expect(weather).toEqual(
                expect.objectContaining({
                    displayName: 'OpenWeather',
                    connected: true,
                    keyHint: 't-key',
                    credentialLabel: 'OpenWeather API key',
                    documentationUrl: 'https://home.openweathermap.org/api_keys',
                }),
            );
            expect(JSON.stringify(res.body)).not.toContain('encryptedCredentials');
        });

        it('reports every configurable service as disconnected without credentials', async () => {
            prisma.serviceConnection.findMany.mockResolvedValue([]);
            prisma.account.findMany.mockResolvedValue([]);

            const res = await request(app).get('/services').set('Origin', FRONTEND);

            expect(res.statusCode).toBe(200);
            for (const name of ['weather', 'crypto', 'stocks', 'github']) {
                expect(res.body.find((service: { name: string }) => service.name === name)).toEqual(
                    expect.objectContaining({ connected: false, configurable: true }),
                );
            }
            for (const name of ['youtube', 'chatbot']) {
                expect(res.body.find((service: { name: string }) => service.name === name)).toEqual(
                    expect.objectContaining({ connected: true, configurable: false }),
                );
            }
        });

        it('requires a connected Twelve Data account to search stocks', async () => {
            prisma.serviceConnection.findUnique.mockResolvedValue(null);
            const res = await request(app)
                .get('/services/stocks/search?q=apple')
                .set('Origin', FRONTEND);
            expect(res.statusCode).toBe(409);
        });

        it('searches stocks using only the authenticated user connection', async () => {
            prisma.serviceConnection.findUnique.mockResolvedValue({
                id: 9,
                encryptedCredentials: encryptJson({ apiKey: 'test-key' }),
            });
            const results = [
                { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', country: 'US' },
            ];
            const search = vi.spyOn(stocks, 'search').mockResolvedValue(results);
            try {
                const res = await request(app)
                    .get('/services/stocks/search?q=apple')
                    .set('Origin', FRONTEND);
                expect(res.statusCode).toBe(200);
                expect(res.body).toEqual(results);
                expect(search).toHaveBeenCalledWith('apple', {
                    credentials: { apiKey: 'test-key' },
                    cacheScope: '1:9',
                    userId: 1,
                });
            } finally {
                search.mockRestore();
            }
        });

        it.each([[{}], [{ apiKey: '   ' }], [{ apiKey: { nested: 'object' } }]])(
            'rejects a missing or non-string API key %j',
            async (body) => {
                const verify = vi.spyOn(weatherService, 'verifyCredentials');

                const res = await request(app)
                    .put('/services/weather/connection')
                    .set('Origin', FRONTEND)
                    .send(body);

                expect(res.statusCode).toBe(400);
                expect(verify).not.toHaveBeenCalled();
                expect(prisma.serviceConnection.upsert).not.toHaveBeenCalled();
            },
        );

        it('verifies and securely saves an OpenWeather API key', async () => {
            const verify = vi.spyOn(weatherService, 'verifyCredentials').mockResolvedValue();
            prisma.serviceConnection.upsert.mockResolvedValue(connection);

            const res = await request(app)
                .put('/services/weather/connection')
                .set('Origin', FRONTEND)
                .send({ apiKey: 'test-api-key' });

            expect(res.statusCode).toBe(200);
            expect(verify).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
            expect(prisma.serviceConnection.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        userId: 1,
                        serviceName: 'weather',
                        encryptedCredentials: expect.objectContaining({ _encrypted: true }),
                    }),
                }),
            );
            expect(res.body).not.toHaveProperty('encryptedCredentials');
            verify.mockRestore();
        });

        it('disconnects a GitHub service account through Better Auth', async () => {
            prisma.account.findMany.mockResolvedValue([{ id: 12, accountId: '1' }]);
            const res = await request(app)
                .delete('/services/github/connection')
                .set('Origin', FRONTEND);
            expect(res.statusCode).toBe(204);
            expect(auth.api.unlinkAccount).toHaveBeenCalledWith(
                expect.objectContaining({ body: { accountId: '12' } }),
            );
            expect(prisma.account.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { userId: 1, providerId: 'github-service' } }),
            );
        });

        it('disconnects only the authenticated user service', async () => {
            prisma.serviceConnection.deleteMany.mockResolvedValue({ count: 1 });

            const res = await request(app)
                .delete('/services/weather/connection')
                .set('Origin', FRONTEND);

            expect(res.statusCode).toBe(204);
            expect(prisma.serviceConnection.deleteMany).toHaveBeenCalledWith({
                where: { userId: 1, serviceName: 'weather' },
            });
        });
    });
});
