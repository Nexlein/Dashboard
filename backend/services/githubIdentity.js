async function getGitHubProfile(accessToken) {
    const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
    });
    const profile = await response.json();
    if (!response.ok || !profile.id || !/^\d+$/.test(String(profile.id))) {
        throw new Error('Could not verify GitHub identity');
    }
    return profile;
}

async function getVerifiedGitHubEmail(accessToken) {
    const response = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
    });
    const emails = await response.json();
    if (!response.ok || !Array.isArray(emails)) throw new Error('Could not verify GitHub email');
    const verified =
        emails.find((email) => email.verified && email.primary) ||
        emails.find((email) => email.verified);
    return verified?.email;
}

module.exports = { getGitHubProfile, getVerifiedGitHubEmail };
