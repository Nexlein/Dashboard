import { GitFork, Star, CircleDot, User, Users, BookOpen } from 'lucide-react';

export function GithubRepoWidget({ data }) {
    if (!data) return null;
    return (
        <div className="flex h-full w-full flex-col gap-3 p-1" data-testid="github-repo-stats">
            <div className="flex items-center gap-2 overflow-hidden">
                <BookOpen className="size-5 shrink-0 text-muted-foreground" />
                <p className="text-base font-bold tracking-tight truncate">{data.name}</p>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
                {data.description || <span className="italic">No description provided.</span>}
            </p>
            <div className="grid grid-cols-3 gap-3 mt-auto">
                <div className="flex flex-col items-center justify-center rounded-xl border bg-gradient-to-b from-amber-500/10 to-transparent p-3 text-amber-600 dark:text-amber-400">
                    <Star className="size-5 mb-1.5" />
                    <span className="text-sm font-bold">{data.stars}</span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border bg-gradient-to-b from-blue-500/10 to-transparent p-3 text-blue-600 dark:text-blue-400">
                    <GitFork className="size-5 mb-1.5" />
                    <span className="text-sm font-bold">{data.forks}</span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border bg-gradient-to-b from-emerald-500/10 to-transparent p-3 text-emerald-600 dark:text-emerald-400">
                    <CircleDot className="size-5 mb-1.5" />
                    <span className="text-sm font-bold">{data.open_issues}</span>
                </div>
            </div>
        </div>
    );
}

export function GithubProfileWidget({ data }) {
    if (!data) return null;
    return (
        <div className="flex h-full w-full flex-col gap-4 p-1" data-testid="github-profile">
            <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                    <img
                        src={data.avatar_url}
                        alt={data.login}
                        className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/10"
                    />
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                        <div className="rounded-full bg-primary/10 p-1">
                            <User className="size-3 text-primary" />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col overflow-hidden">
                    <p className="text-lg font-bold truncate leading-tight">
                        {data.name || data.login}
                    </p>
                    <p className="text-sm font-medium text-muted-foreground truncate">
                        @{data.login}
                    </p>
                </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-3">
                {data.bio || <span className="italic">No bio provided.</span>}
            </p>

            <div className="grid w-full grid-cols-3 gap-2 mt-auto pt-3 border-t">
                <div className="flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">{data.followers}</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mt-0.5">
                        <Users className="size-3" /> Followers
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center border-l border-r">
                    <span className="text-lg font-bold">{data.following}</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                        Following
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">{data.public_repos}</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mt-0.5">
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
        <div className="flex h-full w-full flex-col p-1" data-testid="github-commits">
            <div className="flex items-center gap-2 mb-4">
                <GitFork className="size-5 text-primary" />
                <p className="text-sm font-bold uppercase tracking-wider">Latest Commits</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                {data.map((commit) => (
                    <div key={commit.sha} className="group flex gap-3 text-sm">
                        <div className="relative flex flex-col items-center">
                            <img
                                src={
                                    commit.avatar ||
                                    'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
                                }
                                alt={commit.author}
                                className="h-8 w-8 shrink-0 rounded-full bg-muted object-cover ring-2 ring-background z-10"
                            />
                            <div className="absolute top-8 bottom-[-16px] w-px bg-border group-last:hidden" />
                        </div>
                        <div className="min-w-0 flex-1 pb-1">
                            <a
                                href={commit.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold hover:text-primary transition-colors truncate block"
                            >
                                {commit.message.split('\n')[0]}
                            </a>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span className="font-medium">{commit.author}</span>
                                <span className="size-1 rounded-full bg-muted-foreground/30" />
                                <span>
                                    {new Date(commit.date).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
