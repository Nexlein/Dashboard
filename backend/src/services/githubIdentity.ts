/** The fields of GET https://api.github.com/user this app reads. */
export type GitHubProfile = { id: number; login: string; name: string | null; avatar_url: string };
type GitHubEmail = { email: string; verified: boolean; primary: boolean };

async function getGitHubProfile(accessToken: string): Promise<GitHubProfile> {
    const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
    });
    const profile = (await response.json()) as GitHubProfile;
    if (!response.ok || !profile.id || !/^\d+$/.test(String(profile.id))) {
        throw new Error('Could not verify GitHub identity');
    }
    return profile;
}

async function getVerifiedGitHubEmail(accessToken: string): Promise<string | undefined> {
    const response = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
    });
    const emails = (await response.json()) as GitHubEmail[];
    if (!response.ok || !Array.isArray(emails)) throw new Error('Could not verify GitHub email');
    const verified =
        emails.find((email) => email.verified && email.primary) ||
        emails.find((email) => email.verified);
    return verified?.email;
}

export { getGitHubProfile, getVerifiedGitHubEmail };
