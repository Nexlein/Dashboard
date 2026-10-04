const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const crypto = require('node:crypto');
const { getCache, setCache, deleteCache } = require('../utils/redisCache');
const { encrypt, decrypt } = require('../utils/crypto');
const { getGitHubProfile, getVerifiedGitHubEmail } = require('../services/githubIdentity');
const { decryptParamsStrict } = require('../utils/encryption');
const { registerSchema, loginSchema, updateMeSchema } = require('shared');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../utils/env');

const prisma = new PrismaClient();
const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;
const SALT_ROUNDS = env.SALT_ROUNDS;
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

exports.register = asyncHandler(async (req, res) => {
    const validated = registerSchema.safeParse(req.body);
    if (!validated.success)
        return res.status(400).json({ error: validated.error.issues[0].message });
    const { email, password, displayName } = validated.data;
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) return res.status(409).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
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

exports.login = asyncHandler(async (req, res) => {
    const validated = loginSchema.safeParse(req.body);
    if (!validated.success)
        return res.status(400).json({ error: validated.error.issues[0].message });
    const { email, password } = validated.data;
    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, isAdmin: user.isAdmin }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
    res.json({ message: 'Login successful', token });
});

exports.getMe = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, email: true, displayName: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

exports.updateMe = asyncHandler(async (req, res) => {
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

exports.githubLink = asyncHandler(async (req, res) => {
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
    await setCache(
        `github_link:${state}`,
        {
            userId,
            browserSecretHash: crypto.createHash('sha256').update(browserSecret).digest('hex'),
            expiresAt: Date.now() + GITHUB_LINK_TTL,
        },
        GITHUB_LINK_TTL,
    );
    res.cookie(`github_link_${state}`, browserSecret, {
        ...githubCookieOptions(req),
        maxAge: GITHUB_LINK_TTL,
    });
    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
        scope: 'user:email read:user repo',
        state,
    });
    const authorizationUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    if (req.query.format === 'json') return res.json({ authorizationUrl });
    res.redirect(authorizationUrl);
});

exports.githubLogin = asyncHandler(async (req, res) => {
    if (
        !process.env.GITHUB_CLIENT_ID ||
        !process.env.GITHUB_CLIENT_SECRET ||
        !process.env.GITHUB_CALLBACK_URL
    ) {
        return res.status(503).json({ error: 'GitHub login is not configured' });
    }
    const state = crypto.randomBytes(32).toString('hex');
    const browserSecret = crypto.randomBytes(32).toString('hex');
    await setCache(
        `github_login:${state}`,
        {
            registrationAccepted:
                req.query.cguAccepted === 'true' && req.query.is16OrOlder === 'true',
            browserSecretHash: crypto.createHash('sha256').update(browserSecret).digest('hex'),
            expiresAt: Date.now() + GITHUB_LINK_TTL,
        },
        GITHUB_LINK_TTL,
    );
    res.cookie(`github_login_${state}`, browserSecret, {
        ...githubLoginCookieOptions(req),
        maxAge: GITHUB_LINK_TTL,
    });
    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
        scope: 'user:email read:user repo',
        state,
    });
    const authorizationUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    if (req.query.format === 'json') return res.json({ authorizationUrl });
    res.redirect(authorizationUrl);
});

exports.githubCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    if (typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state))
        return res.status(400).json({ error: 'Missing or invalid state' });
    let isLogin = true;
    let pendingLink = await getCache(`github_login:${state}`);
    if (!pendingLink) {
        isLogin = false;
        pendingLink = await getCache(`github_link:${state}`);
    }
    if (!pendingLink) return res.status(400).json({ error: 'Unknown or already used state' });
    const cookieName = isLogin ? `github_login_${state}` : `github_link_${state}`;
    const cookieOptions = isLogin ? githubLoginCookieOptions(req) : githubCookieOptions(req);
    if (pendingLink.expiresAt <= Date.now()) {
        await deleteCache(isLogin ? `github_login:${state}` : `github_link:${state}`);
        res.clearCookie(cookieName, cookieOptions);
        return res.status(400).json({ error: 'Expired state' });
    }
    const browserSecret = req.cookies[cookieName];
    if (
        typeof browserSecret !== 'string' ||
        !/^[a-f0-9]{64}$/.test(browserSecret) ||
        !crypto.timingSafeEqual(
            crypto.createHash('sha256').update(browserSecret).digest(),
            Buffer.from(pendingLink.browserSecretHash, 'hex'),
        )
    ) {
        return res
            .status(403)
            .json({ error: 'GitHub flow must finish in the browser that started it' });
    }
    await deleteCache(isLogin ? `github_login:${state}` : `github_link:${state}`);
    res.clearCookie(cookieName, cookieOptions);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (req.query.error) return res.redirect(`${frontendUrl}/services?error=github_auth_failed`);
    if (typeof code !== 'string' || !code)
        return res.redirect(`${frontendUrl}/services?error=github_missing_code`);

    let data;
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
        data = await response.json();
        if (
            !response.ok ||
            data.error ||
            typeof data.access_token !== 'string' ||
            !data.access_token
        )
            throw new Error('Could not obtain GitHub token');
    } catch {
        return res.redirect(
            `${frontendUrl}/${isLogin ? 'login' : 'services'}?error=github_flow_failed`,
        );
    }
    const accessToken = data.access_token;
    const tokenData = {
        accessToken: encrypt(data.access_token),
        refreshToken: data.refresh_token ? encrypt(data.refresh_token) : null,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
    };
    let userId = pendingLink.userId;
    let newUserData;
    const userData = await getGitHubProfile(accessToken);
    const githubId = String(userData.id);
    if (isLogin) {
        let user = await prisma.user.findUnique({ where: { githubId } });
        if (!user) {
            const normalizedEmail = normalizeEmail(await getVerifiedGitHubEmail(accessToken));
            if (
                !normalizedEmail ||
                normalizedEmail.length > 254 ||
                !EMAIL_PATTERN.test(normalizedEmail)
            ) {
                return res
                    .status(400)
                    .json({ error: 'GitHub account must have a verified email address' });
            }
            user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
            if (user?.githubId && user.githubId !== githubId)
                return res
                    .status(409)
                    .json({ error: 'This email belongs to a different GitHub identity.' });
            if (!user) {
                if (!pendingLink.registrationAccepted)
                    return res.redirect(
                        `${frontendUrl}/register?error=github_registration_requirements`,
                    );
                newUserData = {
                    email: normalizedEmail,
                    githubId,
                    displayName: userData.name || userData.login || null,
                    password: null,
                    cguAcceptedAt: new Date(),
                };
            }
        }
        userId = user?.id;
    }

    try {
        userId = await prisma.$transaction(async (tx) => {
            let accountId = userId;
            if (newUserData) {
                const user = await tx.user.create({ data: newUserData });
                accountId = user.id;
            } else {
                await tx.user.update({ where: { id: accountId }, data: { githubId } });
            }
            await tx.oAuthToken.upsert({
                where: { userId_provider: { userId: accountId, provider: 'github' } },
                create: { userId: accountId, provider: 'github', ...tokenData },
                update: tokenData,
            });
            return accountId;
        });
    } catch {
        return res.redirect(
            `${frontendUrl}/${isLogin ? 'login' : 'services'}?error=github_flow_failed`,
        );
    }

    if (isLogin) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const token = jwt.sign({ userId: user.id, isAdmin: user.isAdmin }, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });
        res.redirect(`${frontendUrl}/login/oauth?token=${token}`);
    } else {
        res.redirect(`${frontendUrl}/services?linked=github`);
    }
});

exports.downloadData = asyncHandler(async (req, res) => {
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
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.set('Cache-Control', 'no-store');
    try {
        const responsePayload = {
            ...user,
            widgets: user.widgets.map((widget) => ({
                ...widget,
                params: decryptParamsStrict(widget.params),
            })),
        };
        res.json(responsePayload);
    } catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

exports.deleteAccount = asyncHandler(async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.user.userId } });
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Resource not found' });
        throw err;
    }
});
