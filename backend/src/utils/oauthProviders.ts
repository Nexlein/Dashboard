/**
 * Better Auth provider of the GitHub accounts connected to the GitHub *service* (widgets),
 * apart from GitHub sign-in ("github"): a user may connect several, they get the `repo` scope,
 * and they never sign in (src/auth.ts).
 */
export const GITHUB_SERVICE_PROVIDER = 'github-service';

/** Read-only YouTube access for widgets; never a Dashboard sign-in provider. */
export const YOUTUBE_SERVICE_PROVIDER = 'youtube-service';
