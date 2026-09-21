import { GitFork, Star, CircleDot, User, Users, BookOpen } from 'lucide-react';

export function GithubRepoWidget({ data }) {
    if (!data) return null;
    return (
        <div className="flex h-full w-full flex-col gap-3" data-testid="github-repo-stats">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-semibold tracking-tight truncate">{data.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {data.description}
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-auto">
                <div className="flex flex-col items-center rounded-md bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                    <Star className="h-4 w-4 mb-1" />
                    <span className="text-xs font-semibold">{data.stars}</span>
                </div>
                <div className="flex flex-col items-center rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                    <GitFork className="h-4 w-4 mb-1" />
                    <span className="text-xs font-semibold">{data.forks}</span>
                </div>
                <div className="flex flex-col items-center rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                    <CircleDot className="h-4 w-4 mb-1" />
                    <span className="text-xs font-semibold">{data.open_issues}</span>
                </div>
            </div>
        </div>
    );
}

export function GithubProfileWidget({ data }) {
    if (!data) return null;
    return (
        <div
            className="flex h-full w-full flex-col items-center gap-3"
            data-testid="github-profile"
        >
            <div className="flex w-full items-center gap-4">
                <img
                    src={data.avatar_url}
                    alt={data.login}
                    className="h-16 w-16 rounded-full ring-2 ring-primary/20"
                />
                <div className="flex flex-col overflow-hidden">
                    <p className="text-lg font-semibold truncate">{data.name || data.login}</p>
                    <p className="text-sm text-muted-foreground truncate">@{data.login}</p>
                </div>
            </div>
            {data.bio && (
                <p className="text-xs text-muted-foreground text-center line-clamp-2">{data.bio}</p>
            )}
            <div className="grid w-full grid-cols-3 gap-2 mt-auto pt-3 border-t">
                <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold">{data.followers}</span>
                    <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                        <Users className="size-3" /> Followers
                    </span>
                </div>
                <div className="flex flex-col items-center border-l border-r">
                    <span className="text-sm font-semibold">{data.following}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Following</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold">{data.public_repos}</span>
                    <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                        <BookOpen className="size-3" /> Repos
                    </span>
                </div>
            </div>
        </div>
    );
}

export function GithubCommitsWidget({ data }) {
    if (!data || !Array.isArray(data)) return null;
    return (
        <div className="flex h-full w-full flex-col" data-testid="github-commits">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Latest Commits
            </p>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {data.map((commit) => (
                    <div key={commit.sha} className="flex gap-3 text-sm">
                        <img
                            src={
                                commit.avatar ||
                                'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
                            }
                            alt={commit.author}
                            className="h-6 w-6 rounded-full bg-muted"
                        />
                        <div className="min-w-0 flex-1">
                            <a
                                href={commit.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium hover:underline truncate block"
                            >
                                {commit.message.split('\n')[0]}
                            </a>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span className="truncate">{commit.author}</span>
                                <span>•</span>
                                <span>{new Date(commit.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
