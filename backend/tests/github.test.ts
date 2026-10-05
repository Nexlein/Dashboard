import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { stubFetch } from './helpers.ts';
import githubService from '../src/services/github.ts';
import type { ServiceContext } from '../src/services/types.ts';

describe('GitHub Service', () => {
    let fetchMock: Mock;
    let mockContext: ServiceContext & {
        credentials: { accessToken: string };
    };

    beforeEach(() => {
        vi.clearAllMocks();
        fetchMock = stubFetch();
        githubService.clearCache();

        mockContext = {
            userId: 1,
            credentials: { accessToken: 'mock-access' },
            refreshRate: 60,
            cacheScope: 'test',
        };
    });

    describe('Execution', () => {
        it('throws if no credentials provided', async () => {
            await expect(githubService.execute('repo_stats', {}, { userId: 1 })).rejects.toThrow(
                'GitHub account is not connected',
            );
        });

        it('executes repo_stats correctly', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    stargazers_count: 10,
                    forks_count: 5,
                    open_issues_count: 2,
                    full_name: 'test/repo',
                    description: 'test description',
                }),
            });

            const result = await githubService.execute(
                'repo_stats',
                { owner: 'test', repo: 'repo' },
                mockContext,
            );
            expect(result).toEqual({
                stars: 10,
                forks: 5,
                open_issues: 2,
                name: 'test/repo',
                description: 'test description',
            });
        });

        it('encodes user-supplied path segments instead of letting them change the endpoint', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ login: 'x', public_repos: 0, followers: 0, following: 0 }),
            });

            await githubService.execute(
                'user_profile',
                { username: '../user/emails' },
                mockContext,
            );

            expect(fetchMock).toHaveBeenCalledWith(
                'https://api.github.com/users/..%2Fuser%2Femails',
                expect.anything(),
            );
        });

        it('executes latest_commits correctly', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    {
                        sha: '12345',
                        commit: { message: 'init', author: { name: 'test', date: '2026-09-21' } },
                        author: { avatar_url: 'http://avatar' },
                        html_url: 'http://commit',
                    },
                ],
            });

            const result = (await githubService.execute(
                'latest_commits',
                { owner: 'test', repo: 'repo' },
                mockContext,
            )) as unknown[];
            expect(result[0]).toEqual({
                sha: '12345',
                message: 'init',
                author: 'test',
                date: '2026-09-21',
                avatar: 'http://avatar',
                url: 'http://commit',
            });
        });

        it('executes user_profile correctly', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    login: 'testuser',
                    name: 'Test',
                    avatar_url: 'http://avatar',
                    public_repos: 10,
                    followers: 5,
                    following: 2,
                    bio: 'bio',
                }),
            });

            const result = await githubService.execute(
                'user_profile',
                { username: 'testuser' },
                mockContext,
            );
            expect(result).toEqual({
                login: 'testuser',
                name: 'Test',
                avatar_url: 'http://avatar',
                public_repos: 10,
                followers: 5,
                following: 2,
                bio: 'bio',
            });
        });
    });

    describe('Caching', () => {
        it('returns cached data if within TTL', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ stargazers_count: 10, full_name: 'test/repo' }),
            });

            await githubService.execute('repo_stats', { owner: 'test', repo: 'repo' }, mockContext);
            const result2 = await githubService.execute(
                'repo_stats',
                { owner: 'test', repo: 'repo' },
                mockContext,
            );

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(result2).toHaveProperty('stars', 10);
        });
    });

    describe('Errors', () => {
        // Better Auth refreshes tokens before the service runs (utils/oauthAccounts.ts); a
        // revoked token surfaces as GitHub's own status.
        it('reports a rejected token with its status', async () => {
            fetchMock.mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' });

            await expect(
                githubService.execute('repo_stats', { owner: 'test', repo: 'repo' }, mockContext),
            ).rejects.toMatchObject({ message: 'GitHub API error: Unauthorized', statusCode: 401 });
            expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/test/repo', {
                headers: expect.objectContaining({ Authorization: 'Bearer mock-access' }),
            });
        });
    });
});
