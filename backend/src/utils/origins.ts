// Frontend origins allowed to call the API from a browser (CORS) and to send
// state-changing requests authenticated by the session cookie (CSRF check).
const allowedOrigins = (
    process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:8081'
)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

function isAllowedOrigin(origin: string | undefined): boolean {
    return typeof origin === 'string' && allowedOrigins.includes(origin);
}

export { allowedOrigins, isAllowedOrigin };
