import { fetchClient, API_URL, AUTH_TOKEN_KEY } from './apiClient';
import type { RegisterFormData, LoginFormData, UpdateMeFormData, User } from 'shared';

export { API_URL };

type AuthResponse = { message: string; token?: string; userId?: number };

export async function register(payload: RegisterFormData) {
    return fetchClient<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function login(payload: LoginFormData) {
    const response = await fetchClient<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (!response.token) throw new Error('Le serveur n’a pas retourné de jeton de connexion.');
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
}

export async function getCurrentUser(): Promise<User> {
    if (!hasValidAuthToken()) throw new Error('Missing authentication token');
    return fetchClient<User>('/auth/me');
}

export async function updateProfile(payload: UpdateMeFormData): Promise<User> {
    return fetchClient('/auth/me', { method: 'PUT', body: JSON.stringify(payload) });
}

/** GDPR export of everything stored about the current user. */
export async function exportMyData(): Promise<unknown> {
    return fetchClient('/auth/download-data');
}

export async function deleteMyAccount() {
    await fetchClient('/auth/delete-account', { method: 'DELETE' });
}

export function hasValidAuthToken() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return false;
    try {
        // JWT segments are base64url: map back to base64 before decoding.
        const segment = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(segment));
        return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now();
    } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        return false;
    }
}

/** Stores the JWT handed back by the GitHub OAuth redirect. */
export function storeAuthToken(token: string) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function startGitHubLogin(registration?: { cguAccepted: boolean; is16OrOlder: boolean }) {
    const params = new URLSearchParams();
    if (registration) {
        params.set('cguAccepted', String(registration.cguAccepted));
        params.set('is16OrOlder', String(registration.is16OrOlder));
    }
    window.location.assign(`${API_URL}/auth/github/login?${params}`);
}
