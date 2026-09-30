const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const crypto = require('node:crypto');
const { getCache, setCache, deleteCache } = require('../utils/redisCache');
const { encrypt, decrypt } = require('../utils/crypto');
const { getGitHubProfile, getVerifiedGitHubEmail } = require('../services/githubIdentity');
const { decryptParamsStrict } = require('../utils/encryption');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const GITHUB_LINK_TTL = 10 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function githubCookieOptions(req) {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.secure || process.env.NODE_ENV === 'production',
        path: '/auth/github/callback',
    };
}

function githubLoginCookieOptions(req) {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.secure || process.env.NODE_ENV === 'production',
        path: '/auth/github/callback',
    };
}

exports.register = async (req, res, next) => {
    try {
        const { email, password, cguAccepted, is16OrOlder, displayName } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const normalizedDisplayName = typeof displayName === 'string' ? displayName.trim() : '';

        if (!normalizedEmail || typeof password !== 'string') {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                error: 'Password must be between 8 and 72 characters',
            });
        }

        if (normalizedDisplayName.length > 50) {
            return res.status(400).json({ error: 'Display name must be 50 characters or fewer' });
        }

        if (cguAccepted !== true) {
            return res.status(400).json({ error: 'You must accept the CGU to register.' });
        }

        if (is16OrOlder !== true) {
            return res
                .status(400)
                .json({ error: 'You must confirm you are 16 or older to register.' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                displayName: normalizedDisplayName || null,
                password: hashedPassword,
                cguAcceptedAt: new Date(),
            },
        });

        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || typeof password !== 'string' || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, isAdmin: user.isAdmin }, JWT_SECRET, {
            expiresIn: '24h',
        });

        res.json({ message: 'Login successful', token });
    } catch (error) {
        next(error);
    }
};

exports.getMe = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                email: true,
                displayName: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        next(error);
    }
};

exports.updateMe = async (req, res, next) => {
    try {
        const { displayName, email } = req.body;
        const normalizedEmail = email === undefined ? undefined : normalizeEmail(email);
        if (
            email !== undefined &&
            (!normalizedEmail ||
                normalizedEmail.length > 254 ||
                !EMAIL_PATTERN.test(normalizedEmail))
        ) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        if (
            displayName !== undefined &&
            (typeof displayName !== 'string' || displayName.trim().length > 50)
        ) {
            return res.status(400).json({ error: 'Display name must be 50 characters or fewer' });
        }
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
                    const profile = await getGitHubProfile(decrypt(githubToken.accessToken));
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

        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: {
                ...(displayName === undefined ? {} : { displayName: displayName.trim() || null }),
                ...(normalizedEmail === undefined ? {} : { email: normalizedEmail }),
                ...(githubId && githubId !== currentUser.githubId ? { githubId } : {}),
            },
            select: { id: true, email: true, displayName: true },
        });
        res.json(user);
    } catch (error) {
        next(error);
    }
};

exports.downloadData = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
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
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.set('Cache-Control', 'no-store');
        res.json({
            ...user,
            widgets: user.widgets.map((widget) => ({
                ...widget,
                params: decryptParamsStrict(widget.params),
            })),
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteAccount = async (req, res, next) => {
    try {
        await prisma.user.delete({
            where: { id: req.user.userId },
        });
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        next(error);
    }
};
