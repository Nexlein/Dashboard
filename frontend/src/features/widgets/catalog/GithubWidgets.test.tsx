import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeWidget } from '@/test/fixtures';
import {
    GithubCommitsWidget,
    GithubProfileWidget,
    GithubRepoWidget,
    type GithubCommitData,
} from './GithubWidgets';

const viewProps = {
    widget: makeWidget({ serviceName: 'github', widgetName: 'repo_stats' }),
    onPeriodChange: vi.fn(),
    periodUpdating: false,
};

describe('GitHub widgets', () => {
    it('shows repository statistics, with a placeholder for a missing description', () => {
        render(
            <GithubRepoWidget
                {...viewProps}
                data={{
                    name: 'facebook/react',
                    description: null,
                    stars: 230000,
                    forks: 47000,
                    open_issues: 900,
                }}
            />,
        );
        expect(screen.getByText('facebook/react')).toBeInTheDocument();
        expect(screen.getByText('No description provided.')).toBeInTheDocument();
        expect(screen.getByText('230000')).toBeInTheDocument();
        expect(screen.getByText('47000')).toBeInTheDocument();
        expect(screen.getByText('900')).toBeInTheDocument();
    });

    it('shows the login when the profile has no display name', () => {
        render(
            <GithubProfileWidget
                {...viewProps}
                data={{
                    login: 'octocat',
                    name: null,
                    avatar_url: 'https://avatars.githubusercontent.com/u/583231',
                    public_repos: 8,
                    followers: 10,
                    following: 2,
                    bio: null,
                }}
            />,
        );
        expect(screen.getAllByText(/octocat/).length).toBeGreaterThan(0);
        expect(screen.getByText('No bio provided.')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'octocat' })).toHaveAttribute(
            'src',
            'https://avatars.githubusercontent.com/u/583231',
        );
    });

    it('lists commits with their first message line and a link', () => {
        const commits: GithubCommitData[] = [
            {
                sha: 'abc123',
                message: 'Fix the widget grid\n\nLonger explanation',
                author: 'Ada',
                date: '2026-10-01T10:00:00Z',
                url: 'https://github.com/o/r/commit/abc123',
            },
        ];
        render(<GithubCommitsWidget {...viewProps} data={commits} />);
        expect(screen.getByText('Fix the widget grid')).toBeInTheDocument();
        expect(screen.queryByText(/Longer explanation/)).toBeNull();
        expect(screen.getByText('Ada')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute(
            'href',
            'https://github.com/o/r/commit/abc123',
        );
    });
});
