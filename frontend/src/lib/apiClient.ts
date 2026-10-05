export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const AUTH_TOKEN_KEY = 'dashboard-auth-token';

export function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function authHeaders() {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchClient(endpoint: string, options: RequestInit = {}) {
    const headers = {
        ...authHeaders(),
        ...(options.body && typeof options.body === 'string'
            ? { 'Content-Type': 'application/json' }
            : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: headers as HeadersInit,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(body.error || `Request failed with status ${response.status}`);
    }

    return body;
}
