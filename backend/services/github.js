module.exports = {
    name: 'github',
    displayName: 'GitHub',
    connection: {
        type: 'oauth',
        label: 'GitHub Account',
        documentationUrl: 'https://github.com/settings/tokens',
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

        const headers = {
            Authorization: `Bearer ${credentials.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
        };

        if (widgetName === 'repo_stats' || widgetName === 'github-repo') {
            const { owner, repo } = params;
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
            if (!res.ok) {
                const err = new Error(`GitHub API error: ${res.statusText}`);
                err.statusCode = res.status;
                throw err;
            }
            const data = await res.json();
            return {
                stars: data.stargazers_count,
                forks: data.forks_count,
                open_issues: data.open_issues_count,
                name: data.full_name,
                description: data.description,
            };
        }

        if (widgetName === 'latest_commits' || widgetName === 'github-commits') {
            const { owner, repo, branch } = params;
            const res = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch || 'main'}&per_page=5`,
                { headers },
            );
            if (!res.ok) {
                const err = new Error(`GitHub API error: ${res.statusText}`);
                err.statusCode = res.status;
                throw err;
            }
            const data = await res.json();
            return data.map((commit) => ({
                sha: commit.sha,
                message: commit.commit.message,
                author: commit.commit.author.name,
                date: commit.commit.author.date,
                avatar: commit.author?.avatar_url,
                url: commit.html_url,
            }));
        }

        if (widgetName === 'user_profile' || widgetName === 'github-user') {
            const { username } = params;
            const url = username
                ? `https://api.github.com/users/${username}`
                : 'https://api.github.com/user';
            const res = await fetch(url, { headers });
            if (!res.ok) {
                const err = new Error(`GitHub API error: ${res.statusText}`);
                err.statusCode = res.status;
                throw err;
            }
            const data = await res.json();
            return {
                login: data.login,
                name: data.name,
                avatar_url: data.avatar_url,
                public_repos: data.public_repos,
                followers: data.followers,
                following: data.following,
                bio: data.bio,
            };
        }

        throw new Error('Unknown widget name');
    },
};
