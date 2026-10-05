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
    /** OAuth services: the Better Auth provider to link, and the accounts connected. */
    provider?: string;
    accounts?: ConnectedAccount[];
};

/** A connected OAuth account; `login` is null when the provider no longer accepts it. */
export type ConnectedAccount = { id: number; login: string | null; avatarUrl: string | null };

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

/** Removes one connected account of an OAuth service. */
export async function disconnectAccount(serviceName: string, accountId: number): Promise<void> {
    await fetchClient(`/services/${serviceName}/accounts/${accountId}`, { method: 'DELETE' });
}
