import { fetchClient, API_URL } from './apiClient';

export { API_URL };
const AUTH_TOKEN_KEY = 'dashboard-auth-token';

type RegisterPayload = {
    displayName?: string;
    email: string;
    password: string;
    cguAccepted: boolean;
    is16OrOlder: boolean;
};
type LoginPayload = { email: string; password: string };
type AuthResponse = { message: string; token?: string; userId?: number };
export type AuthUser = { id: number; email: string; displayName: string | null };

export async function register(payload: RegisterPayload) {
    return fetchClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
    }) as Promise<AuthResponse>;
}

export async function login(payload: LoginPayload) {
    const response = (await fetchClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
    })) as AuthResponse;
    if (!response.token) throw new Error('Le serveur n’a pas retourné de jeton de connexion.');
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
}

export async function getCurrentUser(): Promise<AuthUser> {
    if (!hasValidAuthToken()) throw new Error('Missing authentication token');
    return fetchClient('/auth/me') as Promise<AuthUser>;
}

export function hasValidAuthToken() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now();
    } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        return false;
    }
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
