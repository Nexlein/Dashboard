export type Theme = 'light' | 'dark' | 'system';

export interface User {
    id: string;
    email: string;
    displayName: string | null;
}

export interface DashboardWidget {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    service: string;
    type: string;
    params?: Record<string, string | number | boolean>;
}

export interface ServiceConnection {
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
    accountInfo?: {
        username: string;
        avatarUrl: string;
    } | null;
}
