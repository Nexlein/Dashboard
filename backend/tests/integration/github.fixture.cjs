// Loaded only by the integration subprocess. No real GitHub requests are sent.
const originalFetch = global.fetch;
global.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://github.com/login/oauth/access_token') {
        return Response.json({
            access_token: 'integration-access',
            refresh_token: 'integration-refresh',
        });
    }
    if (url === 'https://api.github.com/user') {
        return Response.json({
            id: process.env.TEST_GITHUB_ID,
            email: process.env.TEST_GITHUB_EMAIL,
            login: 'integration-user',
        });
    }
    if (url === 'https://api.github.com/user/emails') {
        return Response.json([
            { email: process.env.TEST_GITHUB_EMAIL, verified: true, primary: true },
        ]);
    }
    if (url.startsWith('https://api.github.com/') || url.startsWith('https://github.com/')) {
        throw new Error('Unexpected GitHub request in integration test');
    }
    return originalFetch(input, init);
};
