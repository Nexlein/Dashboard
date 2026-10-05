import { fetchClient, API_URL } from './apiClient';
import type { RegisterFormData, LoginFormData, UpdateMeFormData, User } from 'shared';

export { API_URL };

type AuthResponse = { message: string; userId?: number };

export async function register(payload: RegisterFormData) {
    return fetchClient<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/** Signs in; the API answers with an httpOnly session cookie. */
export async function login(payload: LoginFormData) {
    await fetchClient<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function getCurrentUser(): Promise<User> {
    return fetchClient<User>('/auth/me');
}

/** Prefix of the chat histories kept in localStorage by the chatbot widget. */
export const CHAT_HISTORY_PREFIX = 'dashboard-chat-';

/**
 * Ends the session: the API clears the httpOnly cookie (scripts cannot), and the chat
 * histories kept in this browser are removed so the next person cannot read them.
 */
export async function logout() {
    try {
        await fetchClient('/auth/logout', { method: 'POST' });
    } finally {
        Object.keys(localStorage)
            .filter((key) => key.startsWith(CHAT_HISTORY_PREFIX))
            .forEach((key) => localStorage.removeItem(key));
    }
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

export function startGitHubLogin(registration?: { cguAccepted: boolean; is16OrOlder: boolean }) {
    const params = new URLSearchParams();
    if (registration) {
        params.set('cguAccepted', String(registration.cguAccepted));
        params.set('is16OrOlder', String(registration.is16OrOlder));
    }
    window.location.assign(`${API_URL}/auth/github/login?${params}`);
}
