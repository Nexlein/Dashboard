export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function getAuthToken() {
    return localStorage.getItem('dashboard-auth-token');
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

    // Automatically intercept 401 Unauthorized globally if needed
    if (response.status === 401) {
        localStorage.removeItem('dashboard-auth-token');
        // Handle redirect or let components handle it
    }

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(body.error || `Request failed with status ${response.status}`);
    }

    return body;
}
