import { decryptJsonStrict } from '../utils/encryption.ts';
import asyncHandler from '../utils/asyncHandler.ts';
import prisma from '../utils/prisma.ts';
import { endSession } from '../utils/session.ts';
import { authUser } from '../middleware/auth.ts';

// GDPR: export and delete everything stored about the current user.

export const downloadData = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: authUser(req).userId },
        select: {
            id: true,
            email: true,
            githubId: true,
            displayName: true,
            isAdmin: true,
            cguAcceptedAt: true,
            language: true,
            theme: true,
            createdAt: true,
            updatedAt: true,
            widgets: true,
            serviceConnections: {
                select: {
                    id: true,
                    serviceName: true,
                    createdAt: true,
                    updatedAt: true,
                    verifiedAt: true,
                },
            },
            tokens: { select: { id: true, provider: true, expiresAt: true } },
        },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.set('Cache-Control', 'no-store');
    try {
        const responsePayload = {
            ...user,
            widgets: user.widgets.map((widget) => ({
                ...widget,
                params: decryptJsonStrict(widget.params),
            })),
        };
        res.json(responsePayload);
    } catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export const deleteAccount = asyncHandler(async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: authUser(req).userId } });
        endSession(req, res);
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Resource not found' });
        throw err;
    }
});
