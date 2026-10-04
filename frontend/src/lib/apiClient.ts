export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const AUTH_TOKEN_KEY = 'dashboard-auth-token';

export function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function authHeaders() {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Calls the API and returns the parsed JSON body as T; throws with the API's error message. */
export async function fetchClient<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
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

    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = (body as { error?: unknown }).error;
        throw new Error(
            typeof message === 'string' ? message : `Request failed with status ${response.status}`,
        );
    }

    return body as T;
}
