const request = require('supertest');
const app = require('../index');

// Mock Prisma Client
jest.mock('@prisma/client', () => {
    const mPrisma = {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    };
    return { PrismaClient: jest.fn(() => mPrisma) };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
    });

    describe('POST /auth/register', () => {
        it('should require email and password', async () => {
            const res = await request(app).post('/auth/register').send({ email: 'test@test.com' });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Email and password required');
        });

        it('should register a new user successfully', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.create.mockResolvedValue({ id: 1, email: 'test@test.com' });

            const res = await request(app)
                .post('/auth/register')
                .send({ email: 'test@test.com', password: 'password123', name: 'Test' });

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe('User registered successfully');
            expect(res.body.userId).toBe(1);
        });

        it('should return error if email already in use', async () => {
            prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@test.com' });

            const res = await request(app)
                .post('/auth/register')
                .send({ email: 'test@test.com', password: 'password123' });

            expect(res.statusCode).toBe(409);
            expect(res.body.error).toBe('Email already in use');
        });
    });
});
