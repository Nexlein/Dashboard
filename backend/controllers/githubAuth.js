const crypto = require('node:crypto');
const { getCache, setCache, deleteCache } = require('../utils/redisCache');
const { encryptString } = require('../utils/encryption');
const { getGitHubProfile, getVerifiedGitHubEmail } = require('../services/githubIdentity');
const asyncHandler = require('../utils/asyncHandler');
const { normalizeEmail, signAuthToken } = require('../utils/authToken');
const prisma = require('../utils/prisma');

// GitHub OAuth: link an account to GitHub, or sign in / sign up with GitHub.

const GITHUB_LINK_TTL = 10 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function githubCookieOptions(req) {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.secure || process.env.NODE_ENV === 'production',
        path: '/auth/github/callback',
    };
}

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
    const cookieOptions = isLogin ? githubCookieOptions(req) : githubCookieOptions(req);
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
        accessToken: encryptString(data.access_token),
        refreshToken: data.refresh_token ? encryptString(data.refresh_token) : null,
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
        const token = signAuthToken(user);
        // In the fragment, not the query: browsers never send a fragment to a server, so the
        // JWT stays out of access logs and Referer headers.
        res.redirect(`${frontendUrl}/login/oauth#token=${encodeURIComponent(token)}`);
    } else {
        res.redirect(`${frontendUrl}/services?linked=github`);
    }
});
