import { z } from 'zod';

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

export const registerSchema = z.object({
    email: z.string().trim().email('Invalid email address').max(254),
    password: z.string().min(8, 'Password must be between 8 and 72 characters').max(72),
    displayName: z
        .string()
        .max(50, 'Display name must be 50 characters or fewer')
        .optional()
        .transform((v) => (v || '').trim()),
    cguAccepted: z.literal(true, {
        message: 'You must accept the CGU to register.',
    }),
    is16OrOlder: z.literal(true, {
        message: 'You must confirm you are 16 or older to register.',
    }),
});

export const loginSchema = z.object({
    email: z.string().trim().email('Invalid email address').max(254),
    password: z.string().min(1, 'Email and password required'),
});

export const updateMeSchema = z.object({
    email: z.string().trim().email('Invalid email address').max(254).optional(),
    displayName: z
        .string()
        .max(50, 'Display name must be 50 characters or fewer')
        .optional()
        .transform((v) => (typeof v === 'string' ? v.trim() : v)),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type UpdateMeFormData = z.infer<typeof updateMeSchema>;
