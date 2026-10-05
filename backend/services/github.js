import { encryptString } from '../utils/encryption.js';
import prisma from '../utils/prisma.js';

const MAX_CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_REFRESH_RATE_SECONDS = 60;
import { getCache, setCache, clearCache } from '../utils/redisCache.js';

async function refreshGitHubToken(userId, refreshToken) {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
        throw new Error('GitHub client not configured');
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    const data = await response.json();
    if (!response.ok || data.error || !data.access_token) {
        throw new Error('Could not refresh GitHub token');
    }

    await prisma.oAuthToken.update({
        where: { userId_provider: { userId, provider: 'github' } },
        data: {
            accessToken: encryptString(data.access_token),
            refreshToken: data.refresh_token
                ? encryptString(data.refresh_token)
                : refreshToken
                  ? encryptString(refreshToken)
                  : null,
            expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
        },
    });

    return data.access_token;
}

async function fetchWithRefresh(url, context) {
    let accessToken = context.credentials.accessToken;
    let headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
    };

    let res = await fetch(url, { headers });

    if (res.status === 401 && context.credentials.refreshToken && context.userId) {
        try {
            accessToken = await refreshGitHubToken(
                context.userId,
                context.credentials.refreshToken,
            );
            // Update credentials in memory for subsequent calls if any
            context.credentials.accessToken = accessToken;
            headers.Authorization = `Bearer ${accessToken}`;
            res = await fetch(url, { headers });
        } catch {
            // Let the original 401 fall through
        }
    }

    if (!res.ok) {
        const err = new Error(`GitHub API error: ${res.statusText}`);
        err.statusCode = res.status;
        throw err;
    }
    return res;
}

export default {
    name: 'github',
    displayName: 'GitHub',
    connection: {
        type: 'oauth',
        label: 'GitHub Account',
    },
    widgets: [
        {
            name: 'repo_stats',
            description: 'Displays stars, forks, and open issues for a repository',
            params: [
                { name: 'owner', type: 'string' },
                { name: 'repo', type: 'string' },
            ],
        },
        {
            name: 'latest_commits',
            description: 'Displays the latest commits from a branch',
            params: [
                { name: 'owner', type: 'string' },
                { name: 'repo', type: 'string' },
                { name: 'branch', type: 'string' },
            ],
        },
        {
            name: 'user_profile',
            description: 'Displays a GitHub user profile',
            params: [{ name: 'username', type: 'string' }],
        },
    ],
    execute: async (widgetName, params, context) => {
        const { credentials } = context;
        if (!credentials || !credentials.accessToken) {
            const error = new Error('GitHub account is not connected');
            error.statusCode = 401;
            throw error;
        }

        const cacheScope = context.cacheScope || 'unscoped';
        const cacheKey = `${cacheScope}:${widgetName}:${JSON.stringify(params)}`;
        const requestedRefreshRate = Number(context.refreshRate);
        const refreshRate = Number.isFinite(requestedRefreshRate)
            ? Math.max(requestedRefreshRate, MIN_REFRESH_RATE_SECONDS)
            : MIN_REFRESH_RATE_SECONDS;
        const cacheTtlMs = Math.min(refreshRate * 1000, MAX_CACHE_TTL_MS);
        const cached = await getCache(cacheKey);
        if (cached) return cached;

        if (widgetName === 'repo_stats' || widgetName === 'github-repo') {
            const { owner, repo } = params;
            const res = await fetchWithRefresh(
                `https://api.github.com/repos/${owner}/${repo}`,
                context,
            );
            const data = await res.json();
            const result = {
                stars: data.stargazers_count,
                forks: data.forks_count,
                open_issues: data.open_issues_count,
                name: data.full_name,
                description: data.description,
            };
            await setCache(cacheKey, result, cacheTtlMs);
            return result;
        }

        if (widgetName === 'latest_commits' || widgetName === 'github-commits') {
            const { owner, repo, branch } = params;
            const res = await fetchWithRefresh(
                `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch || 'main'}&per_page=5`,
                context,
            );
            const data = await res.json();
            const result = data.map((commit) => ({
                sha: commit.sha,
                message: commit.commit.message,
                author: commit.commit.author.name,
                date: commit.commit.author.date,
                avatar: commit.author?.avatar_url,
                url: commit.html_url,
            }));
            await setCache(cacheKey, result, cacheTtlMs);
            return result;
        }

        if (widgetName === 'user_profile' || widgetName === 'github-user') {
            const { username } = params;
            const url = username
                ? `https://api.github.com/users/${username}`
                : 'https://api.github.com/user';
            const res = await fetchWithRefresh(url, context);
            const data = await res.json();
            const result = {
                login: data.login,
                name: data.name,
                avatar_url: data.avatar_url,
                public_repos: data.public_repos,
                followers: data.followers,
                following: data.following,
                bio: data.bio,
            };
            await setCache(cacheKey, result, cacheTtlMs);
            return result;
        }

        throw new Error('Unknown widget name');
    },
    clearCache,
};
