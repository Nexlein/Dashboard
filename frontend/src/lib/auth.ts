export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const AUTH_TOKEN_KEY = 'dashboard-auth-token';

type RegisterPayload = {
    displayName?: string;
    email: string;
    password: string;
    cguAccepted: boolean;
};

type LoginPayload = {
    email: string;
    password: string;
};

type AuthResponse = {
    message: string;
    token?: string;
    userId?: number;
};

export type AuthUser = {
    id: number;
    email: string;
    displayName: string | null;
};

async function authRequest(path: string, payload: RegisterPayload | LoginPayload) {
    const response = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => ({}))) as Partial<AuthResponse> & {
        error?: string;
    };

    if (!response.ok) {
        throw new Error(body.error ?? 'Une erreur est survenue. Réessayez plus tard.');
    }

    return body as AuthResponse;
}

export function register(payload: RegisterPayload) {
    return authRequest('/auth/register', payload);
}

export async function login(payload: LoginPayload) {
    const response = await authRequest('/auth/login', payload);

    if (!response.token) {
        throw new Error('Le serveur n’a pas retourné de jeton de connexion.');
    }

    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
}

export async function getCurrentUser() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) throw new Error('Missing authentication token');

    const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        if (response.status === 401) localStorage.removeItem(AUTH_TOKEN_KEY);
        throw new Error('Unable to load the authenticated user');
    }

    return (await response.json()) as AuthUser;
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
