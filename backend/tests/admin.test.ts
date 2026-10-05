import { describe, test, expect, vi, beforeEach } from 'vitest';
import { signToken } from './helpers.ts';
import request from 'supertest';

// The shared client from utils/prisma.ts: plain stubs, hoisted for vi.mock.
const prisma = vi.hoisted(() => ({
    user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
    },
}));
vi.mock('../src/utils/prisma.ts', () => ({ default: prisma }));

import app from '../src/app.ts';
// Runs before the imports below: the app reads these when it loads.
vi.hoisted(() => {
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters!';
});

const adminToken = signToken({ userId: 1, isAdmin: true });

describe('Admin routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
