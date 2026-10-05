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
    return fetchClient<ServiceConnection>(`/services/${serviceName}/connection`, {
        method: 'PUT',
        body: JSON.stringify({ apiKey }),
    });
}

export async function disconnectService(serviceName: string): Promise<void> {
    await fetchClient(`/services/${serviceName}/connection`, { method: 'DELETE' });
}
