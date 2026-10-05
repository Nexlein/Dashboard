import bcrypt from 'bcrypt';
import { decryptString } from '../utils/encryption.ts';
import { getGitHubProfile } from '../services/githubIdentity.ts';
import { registerSchema, loginSchema, updateMeSchema } from 'shared';
import asyncHandler from '../utils/asyncHandler.ts';
import { normalizeEmail } from '../utils/authToken.ts';
import { startSession, endSession } from '../utils/session.ts';
import env from '../utils/env.ts';
import prisma from '../utils/prisma.ts';

// Password registration/login and the current user's profile.
// GitHub OAuth lives in githubAuth.js, GDPR export/deletion in account.js.

export const register = asyncHandler(async (req, res) => {
    const validated = registerSchema.safeParse(req.body);
    if (!validated.success)
        return res.status(400).json({ error: validated.error.issues[0].message });
    const { email, password, displayName } = validated.data;
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) return res.status(409).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, env.SALT_ROUNDS);
    const user = await prisma.user.create({
        data: {
            email: normalizedEmail,
            displayName: displayName || null,
            password: hashedPassword,
            cguAcceptedAt: new Date(),
        },
    });
    res.status(201).json({ message: 'User registered successfully', userId: user.id });
});

export const login = asyncHandler(async (req, res) => {
    const validated = loginSchema.safeParse(req.body);
    if (!validated.success)
        return res.status(400).json({ error: validated.error.issues[0].message });
    const { email, password } = validated.data;
    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    startSession(req, res, user);
    res.json({ message: 'Login successful' });
});

export const logout = (req, res) => {
    endSession(req, res);
    res.status(204).send();
};

export const getMe = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, email: true, displayName: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

export const updateMe = asyncHandler(async (req, res) => {
    const validated = updateMeSchema.safeParse(req.body);
    if (!validated.success)
        return res.status(400).json({ error: validated.error.issues[0].message });
    const { displayName, email } = validated.data;
    const normalizedEmail = email === undefined ? undefined : normalizeEmail(email);
    const currentUser = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { email: true, password: true, githubId: true },
    });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });
    let githubId = currentUser.githubId;

    if (normalizedEmail !== undefined && normalizedEmail !== currentUser.email && !githubId) {
        const githubToken = await prisma.oAuthToken.findUnique({
            where: { userId_provider: { userId: req.user.userId, provider: 'github' } },
        });
        if (githubToken) {
            try {
                const profile = await getGitHubProfile(decryptString(githubToken.accessToken));
                githubId = String(profile.id);
            } catch {
                return res
                    .status(409)
                    .json({ error: 'Reconnect GitHub before changing your email.' });
            }
        } else if (!currentUser.password) {
            return res
                .status(409)
                .json({ error: 'Sign in with GitHub again before changing your email.' });
        }
    }

    let user;
    try {
        user = await prisma.user.update({
            where: { id: req.user.userId },
            data: {
                ...(displayName === undefined ? {} : { displayName: displayName.trim() || null }),
                ...(normalizedEmail === undefined ? {} : { email: normalizedEmail }),
                ...(githubId && githubId !== currentUser.githubId ? { githubId } : {}),
            },
            select: { id: true, email: true, displayName: true },
        });
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ error: 'Email already taken' });
        throw err;
    }
    res.json(user);
});
