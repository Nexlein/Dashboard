import { apiError } from '../utils/apiError.ts';
import { decryptJsonStrict } from '../utils/encryption.ts';
import asyncHandler from '../utils/asyncHandler.ts';
import prisma from '../utils/prisma.ts';
import { authUser } from '../middleware/auth.ts';

// GDPR export of the signed-in user's data. Profile edits, sign-in methods, sessions and
// account deletion are Better Auth's (/api/auth/*).

export const downloadData = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: authUser(req).userId },
        select: {
            id: true,
            email: true,
            emailVerified: true,
            name: true,
            image: true,
            role: true,
            cguAcceptedAt: true,
            language: true,
            theme: true,
            createdAt: true,
            updatedAt: true,
            widgets: true,
            // Never the credentials, password hashes or tokens.
            serviceConnections: {
                select: {
                    id: true,
                    serviceName: true,
                    createdAt: true,
                    updatedAt: true,
                    verifiedAt: true,
                },
            },
            accounts: {
                select: { id: true, providerId: true, scope: true, createdAt: true },
            },
            sessions: {
                select: {
                    id: true,
                    createdAt: true,
                    expiresAt: true,
                    ipAddress: true,
                    userAgent: true,
                },
            },
        },
    });
    if (!user) return res.status(404).json({ ...apiError('User not found', 'USER_NOT_FOUND') });
    res.set('Cache-Control', 'no-store');
    try {
        res.json({
            ...user,
            widgets: user.widgets.map((widget) => ({
                ...widget,
                params: decryptJsonStrict(widget.params),
            })),
        });
    } catch {
        return res
            .status(500)
            .json({ ...apiError('Internal server error', 'INTERNAL_SERVER_ERROR') });
    }
});
