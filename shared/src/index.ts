import { z } from 'zod';

/** Shape of GET /auth/me. */
export interface User {
    id: number;
    email: string;
    displayName: string | null;
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
