import { API_URL } from './auth';

export type ServiceConnection = {
    name: string;
    displayName: string;
    configurable: boolean;
    connectionType: string | null;
    credentialLabel: string | null;
    documentationUrl: string | null;
    connected: boolean;
    keyHint: string | null;
    verifiedAt: string | null;
};

function authHeaders() {
    const token = localStorage.getItem('dashboard-auth-token');
    return { Authorization: `Bearer ${token}` };
}

async function responseBody(response: Response) {
    return response.json().catch(() => ({}));
}

export async function fetchServices(): Promise<ServiceConnection[]> {
    const response = await fetch(`${API_URL}/services`, { headers: authHeaders() });
    const body = await responseBody(response);
    if (!response.ok) throw new Error(body.error || 'Unable to load services');
    return body;
}

export async function connectService(serviceName: string, apiKey: string) {
    const response = await fetch(`${API_URL}/services/${serviceName}/connection`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
    });
    const body = await responseBody(response);
    if (!response.ok) throw new Error(body.error || 'Unable to connect service');
    return body as ServiceConnection;
}

export async function disconnectService(serviceName: string) {
    const response = await fetch(`${API_URL}/services/${serviceName}/connection`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    if (!response.ok) {
        const body = await responseBody(response);
        throw new Error(body.error || 'Unable to disconnect service');
    }
}
