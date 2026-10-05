import { updateMeSchema } from 'shared';
import { decryptJsonStrict } from '../utils/encryption.ts';
import asyncHandler from '../utils/asyncHandler.ts';
import prisma from '../utils/prisma.ts';
import { prismaErrorCode } from '../utils/prismaError.ts';
import { authUser } from '../middleware/auth.ts';

// The signed-in user's own data: GDPR export and profile edits. Sign-in methods, sessions and
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
    if (!user) return res.status(404).json({ error: 'User not found' });
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
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export const updateProfile = asyncHandler(async (req, res) => {
    const validated = updateMeSchema.safeParse(req.body);
    if (!validated.success)
        return res.status(400).json({ error: validated.error.issues[0].message });
    const { name, email } = validated.data;
    const userId = authUser(req).userId;

    const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });
    if (!current) return res.status(404).json({ error: 'User not found' });
    const newEmail = email?.toLowerCase();
    const emailChanged = newEmail !== undefined && newEmail !== current.email;

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name === undefined ? {} : { name }),
                // GitHub sign-in is bound to the GitHub account, not to this address, so it
                // keeps working; the new address has not been verified.
                ...(emailChanged ? { email: newEmail, emailVerified: false } : {}),
            },
            select: { id: true, email: true, name: true },
        });
        res.json(user);
    } catch (err) {
        if (prismaErrorCode(err) === 'P2002')
            return res.status(409).json({ error: 'Email already taken' });
        throw err;
    }
});
