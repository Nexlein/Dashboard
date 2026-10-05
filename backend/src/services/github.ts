import { HttpError } from '../utils/httpError.ts';
import { getCache, setCache, clearCache } from '../utils/redisCache.ts';
import type { ServiceContext, ServiceDefinition, WidgetParams } from './types.ts';

const MAX_CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_REFRESH_RATE_SECONDS = 60;

// The parts of the GitHub responses this service reads.
type Repository = {
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    full_name: string;
    description: string | null;
};
type Commit = {
    sha: string;
    html_url: string;
    commit: { message: string; author: { name: string; date: string } };
    author?: { avatar_url: string } | null;
};
type Profile = {
    login: string;
    name: string | null;
    avatar_url: string;
    public_repos: number;
    followers: number;
    following: number;
    bio: string | null;
};
type GitHubCredentials = { accessToken: string };

/** A user-supplied path segment (owner, repository, branch, user name), URL-encoded. */
function segment(value: unknown): string {
    return encodeURIComponent(String(value ?? ''));
}

/** GET `url` with the user's token; Better Auth refreshed it if needed (utils/oauthAccounts). */
async function fetchGitHub(url: string, credentials: GitHubCredentials): Promise<Response> {
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
        },
    });
    if (!res.ok) {
        throw new HttpError(`GitHub API error: ${res.statusText}`, res.status);
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
    execute: async (widgetName: string, params: WidgetParams, context: ServiceContext) => {
        const credentials = context.credentials as GitHubCredentials | null | undefined;
        if (!credentials || typeof credentials.accessToken !== 'string') {
            throw new HttpError('GitHub account is not connected', 401);
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
            const res = await fetchGitHub(
                `https://api.github.com/repos/${segment(params.owner)}/${segment(params.repo)}`,
                credentials,
            );
            const data = (await res.json()) as Repository;
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
            const query = new URLSearchParams({
                sha: String(params.branch || 'main'),
                per_page: '5',
            });
            const res = await fetchGitHub(
                `https://api.github.com/repos/${segment(params.owner)}/${segment(params.repo)}/commits?${query}`,
                credentials,
            );
            const data = (await res.json()) as Commit[];
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
            const url = params.username
                ? `https://api.github.com/users/${segment(params.username)}`
                : 'https://api.github.com/user';
            const res = await fetchGitHub(url, credentials);
            const data = (await res.json()) as Profile;
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

        throw new HttpError('Unknown widget name', 400);
    },
    clearCache,
} satisfies ServiceDefinition & { clearCache: typeof clearCache };
