import { fetchClient } from '@/lib/apiClient';

export type ServiceConnection = {
    name: string;
    displayName: string;
    description: string | null;
    configurable: boolean;
    connectionType: string | null;
    credentialLabel: string | null;
    documentationUrl: string | null;
    connected: boolean;
    keyHint: string | null;
    verifiedAt: string | null;
    accountInfo?: { username: string; avatarUrl: string } | null;
};

export async function fetchServices(): Promise<ServiceConnection[]> {
    return fetchClient('/services');
}

export async function connectService(serviceName: string, apiKey: string) {
    return fetchClient(`/services/${serviceName}/connection`, {
        method: 'PUT',
        body: JSON.stringify({ apiKey }),
    }) as Promise<ServiceConnection>;
}

export async function disconnectService(serviceName: string) {
    return fetchClient(`/services/${serviceName}/connection`, {
        method: 'DELETE',
    });
}

export async function getOAuthUrl(serviceName: string) {
    const response = await fetchClient(`/auth/${serviceName}?format=json`, {
        credentials: 'include',
    });
    return response.authorizationUrl;
}
