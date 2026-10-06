import { z } from 'zod';

/** Shape of GET /auth/me. */
export interface User {
    id: number;
    email: string;
    /** Display name; empty when the user did not give one. */
    name: string;
    /** "admin" opens the administration page. */
    role: UserRole;
}

export type UserRole = 'user' | 'admin';

// Trimmed before it is validated: z.email() alone would reject surrounding spaces.
const email = z.string().trim().pipe(z.email('Invalid email address').max(254));

export const registerSchema = z.object({
    email,
    password: z
        .string()
        .min(8, 'Password must be between 8 and 128 characters')
        .max(128, 'Password must be between 8 and 128 characters'),
    name: z
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
    email,
    password: z.string().min(1, 'Email and password required'),
});

/** Profile edits (the email changes through an emailed code, see the API docs). */
export const profileSchema = z.object({
    name: z
        .string()
        .max(50, 'Display name must be 50 characters or fewer')
        .transform((v) => v.trim()),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;

export { youtubeVideoId, youtubeChannels } from './youtube';
