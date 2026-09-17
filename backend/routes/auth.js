const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const requireAuth = require('../middleware/auth');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const crypto = require('node:crypto');
const pendingGithubLinks = new Map();
const GITHUB_LINK_TTL = 10 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

const credentialsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again later.' },
});

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

router.use('/github', cookieParser(), (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    next();
});

router.use(['/register', '/login'], credentialsLimiter);

router.post('/register', async (req, res) => {
    try {
        const { email, password, cguAccepted, displayName } = req.body;
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

        if (!cguAccepted) {
            return res.status(400).json({ error: 'You must accept the CGU to register.' });
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
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
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
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/me', requireAuth, async (req, res) => {
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
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/github', requireAuth, (req, res) => {
    if (
        !process.env.GITHUB_CLIENT_ID ||
        !process.env.GITHUB_CLIENT_SECRET ||
        !process.env.GITHUB_CALLBACK_URL
    ) {
        return res.status(503).json({ error: 'GitHub linking is not configured' });
    }

    const userId = req.user.userId;
    const state = crypto.randomBytes(32).toString('hex');
    const browserSecret = crypto.randomBytes(32).toString('hex');
    // Remove abandoned requests too, even if their callback never arrives.
    const cleanupTimer = setTimeout(() => pendingGithubLinks.delete(state), GITHUB_LINK_TTL);
    cleanupTimer.unref();

    pendingGithubLinks.set(state, {
        userId,
        browserSecretHash: crypto.createHash('sha256').update(browserSecret).digest(),
        expiresAt: Date.now() + GITHUB_LINK_TTL,
        cleanupTimer,
    });

    // A cookie per request allows separate tabs to complete their own linking flow.
    res.cookie(`github_link_${state}`, browserSecret, {
        ...githubCookieOptions(req),
        maxAge: GITHUB_LINK_TTL,
    });

    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
        scope: 'read:user',
        state,
    });

    const authorizationUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    // Browser fetches need the URL as JSON, then navigate to GitHub themselves.
    if (req.query.format === 'json') {
        return res.json({ authorizationUrl });
    }
    res.redirect(authorizationUrl);
});

router.get('/github/callback', async (req, res) => {
    const { code, state } = req.query;

    if (typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state)) {
        return res.status(400).json({ error: 'Missing or invalid state' });
    }

    const pendingLink = pendingGithubLinks.get(state);

    if (!pendingLink) {
        return res.status(400).json({ error: 'Unknown or already used state' });
    }

    if (pendingLink.expiresAt <= Date.now()) {
        clearTimeout(pendingLink.cleanupTimer);
        pendingGithubLinks.delete(state);
        res.clearCookie(`github_link_${state}`, githubCookieOptions(req));
        return res.status(400).json({ error: 'Expired state' });
    }

    const browserSecret = req.cookies[`github_link_${state}`];
    if (
        typeof browserSecret !== 'string' ||
        !/^[a-f0-9]{64}$/.test(browserSecret) ||
        !crypto.timingSafeEqual(
            crypto.createHash('sha256').update(browserSecret).digest(),
            pendingLink.browserSecretHash,
        )
    ) {
        // Do not consume a valid request when another browser tries its URL.
        return res
            .status(403)
            .json({ error: 'GitHub linking must finish in the browser that started it' });
    }

    clearTimeout(pendingLink.cleanupTimer);
    pendingGithubLinks.delete(state);
    res.clearCookie(`github_link_${state}`, githubCookieOptions(req));

    if (req.query.error) {
        return res.status(400).json({ error: 'GitHub authorization failed or refused' });
    }

    if (typeof code !== 'string' || !code) {
        return res.status(400).json({ error: 'Missing or invalid code' });
    }

    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: process.env.GITHUB_CALLBACK_URL,
            }),
            signal: AbortSignal.timeout(10000),
        });

        const data = await response.json();

        if (
            !response.ok ||
            data.error ||
            typeof data.access_token !== 'string' ||
            !data.access_token
        ) {
            return res.status(502).json({ error: 'Could not obtain GitHub token' });
        }

        const tokenData = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token ?? null,
            expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
        };

        await prisma.oAuthToken.upsert({
            where: {
                userId_provider: {
                    userId: pendingLink.userId,
                    provider: 'github',
                },
            },
            create: {
                userId: pendingLink.userId,
                provider: 'github',
                ...tokenData,
            },
            update: tokenData,
        });

        res.json({
            message: 'GitHub account linked',
            userId: pendingLink.userId,
        });
    } catch {
        res.status(500).json({ error: 'GitHub linking failed' });
    }
});

module.exports = router;
