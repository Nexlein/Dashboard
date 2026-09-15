module.exports = {
    name: 'github',
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
    ],
};
