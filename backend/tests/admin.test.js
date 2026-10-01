process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters!';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('@prisma/client', () => {
    const mockPrisma = {
        user: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            delete: jest.fn(),
        },
    };

    return {
        PrismaClient: jest.fn(() => mockPrisma),
    };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = require('../app');

const adminToken = jwt.sign({ userId: 1, isAdmin: true }, process.env.JWT_SECRET);

describe('Admin routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('rejects unauthenticated requests', async () => {
        const response = await request(app).get('/admin/users');

        expect(response.statusCode).toBe(401);
    });

    test('rejects non-admin users', async () => {
        prisma.user.findUnique.mockResolvedValue({ isAdmin: false });

        const response = await request(app)
            .get('/admin/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(403);
    });

    test('allows an admin to list users', async () => {
        prisma.user.findUnique.mockResolvedValue({ isAdmin: true });
        prisma.user.findMany.mockResolvedValue([
            {
                id: 2,
                email: 'user@test.com',
                displayName: 'Test User',
                isAdmin: false,
            },
        ]);

        const response = await request(app)
            .get('/admin/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual([
            {
                id: 2,
                email: 'user@test.com',
                displayName: 'Test User',
                isAdmin: false,
            },
        ]);

        expect(prisma.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                select: expect.objectContaining({ displayName: true }),
            }),
        );
    });

    test('allows an admin to delete another user', async () => {
        prisma.user.findUnique.mockResolvedValue({ isAdmin: true });
        prisma.user.delete.mockResolvedValue({ id: 2 });

        const response = await request(app)
            .delete('/admin/users/2')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(204);
        expect(prisma.user.delete).toHaveBeenCalledWith({
            where: { id: 2 },
        });
    });

    test('returns 404 when the user does not exist', async () => {
        prisma.user.findUnique.mockResolvedValue({ isAdmin: true });
        prisma.user.delete.mockRejectedValue(Object.assign(new Error(), { code: 'P2025' }));

        const response = await request(app)
            .delete('/admin/users/999')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({ error: 'User not found' });
    });

    test('prevents an admin from deleting their own account', async () => {
        prisma.user.findUnique.mockResolvedValue({ isAdmin: true });

        const response = await request(app)
            .delete('/admin/users/1')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(403);
        expect(prisma.user.delete).not.toHaveBeenCalled();
    });
});
