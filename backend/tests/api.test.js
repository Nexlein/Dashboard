process.env.JWT_SECRET = 'api-test-secret-that-is-long-enough-for-authentication-tests';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const weatherService = require('../services/weather');

// Mock Prisma Client
jest.mock('@prisma/client', () => {
    const mPrisma = {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        widgetConfig: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            delete: jest.fn(),
        },
        serviceConnection: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            upsert: jest.fn(),
            deleteMany: jest.fn(),
        },
        oAuthToken: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            upsert: jest.fn(),
            deleteMany: jest.fn(),
        },
        $transaction: jest.fn(),
        $queryRaw: jest.fn(),
    };
    return { PrismaClient: jest.fn(() => mPrisma) };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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

    describe('POST /auth/register', () => {
        it('should require email and password', async () => {
            const res = await request(app).post('/auth/register').send({ email: 'test@test.com' });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Email and password required');
        });

        it('should require CGU acceptance', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({ email: 'test@test.com', password: 'password123' });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('You must accept the CGU to register.');
        });

        it('should reject invalid email addresses', async () => {
            const res = await request(app).post('/auth/register').send({
                email: 'not-an-email',
                password: 'password123',
                cguAccepted: true,
            });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Invalid email address');
        });

        it('should require a password between 8 and 72 characters', async () => {
            const res = await request(app).post('/auth/register').send({
                email: 'test@test.com',
                password: 'short',
                cguAccepted: true,
            });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Password must be between 8 and 72 characters');
        });

        it('should register a new user successfully', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.create.mockResolvedValue({
                id: 1,
                email: 'test@test.com',
                displayName: 'Test User',
            });

            const res = await request(app).post('/auth/register').send({
                email: ' Test@TEST.com ',
                password: 'password123',
                displayName: '  Test User  ',
                cguAccepted: true,
            });

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe('User registered successfully');
            expect(res.body.userId).toBe(1);
            expect(prisma.user.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    email: 'test@test.com',
                    displayName: 'Test User',
                }),
            });
        });

        it('should reject a display name longer than 50 characters', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({
                    email: 'test@test.com',
                    password: 'password123',
                    displayName: 'a'.repeat(51),
                    cguAccepted: true,
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Display name must be 50 characters or fewer');
            expect(prisma.user.create).not.toHaveBeenCalled();
        });

        it('should allow registration without a display name', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.create.mockResolvedValue({ id: 2, email: 'anonymous@test.com' });

            const res = await request(app).post('/auth/register').send({
                email: 'anonymous@test.com',
                password: 'password123',
                cguAccepted: true,
            });

            expect(res.statusCode).toBe(201);
            expect(prisma.user.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ displayName: null }),
            });
        });

        it('should return error if email already in use', async () => {
            prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@test.com' });

            const res = await request(app)
                .post('/auth/register')
                .send({ email: 'test@test.com', password: 'password123', cguAccepted: true });

            expect(res.statusCode).toBe(409);
            expect(res.body.error).toBe('Email already in use');
        });

        it('should rate limit repeated authentication attempts', async () => {
            let response;

            for (let attempt = 0; attempt < 21; attempt += 1) {
                response = await request(app).post('/auth/login').send({});
            }

            expect(response.statusCode).toBe(429);
            expect(response.body.error).toBe(
                'Too many authentication attempts. Please try again later.',
            );
        });
    });

    describe('GET /auth/me', () => {
        it('returns the authenticated user profile', async () => {
            const token = jwt.sign({ userId: 7, isAdmin: false }, process.env.JWT_SECRET);
            prisma.user.findUnique.mockResolvedValue({
                id: 7,
                email: 'user@example.com',
                displayName: 'Test User',
            });

            const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({
                id: 7,
                email: 'user@example.com',
                displayName: 'Test User',
            });
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 7 },
                select: { id: true, email: true, displayName: true },
            });
        });

        it('rejects unauthenticated profile requests', async () => {
            const res = await request(app).get('/auth/me');

            expect(res.statusCode).toBe(401);
        });
    });

    describe('Widget CRUD API', () => {
        const token = jwt.sign({ userId: 1, isAdmin: false }, process.env.JWT_SECRET);
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
            const res = await request(app).get('/widgets');

            expect(res.statusCode).toBe(401);
        });

        it('should create a widget with encrypted params and return the public contract', async () => {
            const { encryptJson } = require('../utils/encryption');
            prisma.serviceConnection.findUnique.mockResolvedValue({
                id: 9,
                encryptedCredentials: encryptJson({ apiKey: 'test' }),
            });
            prisma.widgetConfig.create.mockResolvedValue(mockWidget);
            const executeSpy = jest.spyOn(weatherService, 'execute').mockResolvedValue({});

            const res = await request(app)
                .post('/widgets')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    serviceName: 'weather',
                    widgetName: 'current_weather',
                    params: { city: 'Paris' },
                    refreshRate: 60,
                    layout: { x: 0, y: 0, w: 2, h: 2 },
                });

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
                .set('Authorization', `Bearer ${token}`)
                .send({
                    serviceName: 'weather',
                    widgetName: 'current_weather',
                    params: { city: 'Paris' },
                    refreshRate: 30,
                    layout: { x: 0, y: 0, w: 2, h: 2 },
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Refresh rate must be at least 60 seconds');
            expect(prisma.widgetConfig.create).not.toHaveBeenCalled();
        });

        it('should batch update widget layouts', async () => {
            prisma.$transaction.mockResolvedValue();

            const res = await request(app)
                .put('/widgets/layout')
                .set('Authorization', `Bearer ${token}`)
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
            const execute = jest.spyOn(weatherService, 'execute').mockResolvedValue({
                type: 'current_weather',
                temperature: 19,
            });

            const res = await request(app)
                .get('/widgets/1/data')
                .set('Authorization', `Bearer ${token}`);

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

        it('requires the user to connect OpenWeather before creating a weather widget', async () => {
            prisma.serviceConnection.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .post('/widgets')
                .set('Authorization', `Bearer ${token}`)
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
    });

    describe('Service connections API', () => {
        const token = jwt.sign({ userId: 1, isAdmin: false }, process.env.JWT_SECRET);
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
            prisma.oAuthToken.findMany.mockResolvedValue([]);

            const res = await request(app).get('/services').set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            const weather = res.body.find((service) => service.name === 'weather');
            expect(weather).toEqual(
                expect.objectContaining({
                    displayName: 'OpenWeather',
                    connected: true,
                    keyHint: 't-key',
                }),
            );
            expect(JSON.stringify(res.body)).not.toContain('encryptedCredentials');
        });

        it('verifies and securely saves an OpenWeather API key', async () => {
            const verify = jest.spyOn(weatherService, 'verifyCredentials').mockResolvedValue();
            prisma.serviceConnection.upsert.mockResolvedValue(connection);

            const res = await request(app)
                .put('/services/weather/connection')
                .set('Authorization', `Bearer ${token}`)
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

        it('disconnects only the authenticated user service', async () => {
            prisma.serviceConnection.deleteMany.mockResolvedValue({ count: 1 });

            const res = await request(app)
                .delete('/services/weather/connection')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(204);
            expect(prisma.serviceConnection.deleteMany).toHaveBeenCalledWith({
                where: { userId: 1, serviceName: 'weather' },
            });
        });
    });
});
