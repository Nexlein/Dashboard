import { z } from 'zod';
import { validationParams } from './apiErrors';

// Configure before creating schemas: Zod's eval capability probe itself violates strict CSPs.
// Server-side validation can retain its fast path; browsers use the CSP-compatible parser.
if (typeof window !== 'undefined') z.config({ jitless: true });

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
const email = z
    .string()
    .trim()
    .refine(
        (value) => value.length <= 254 && z.email().safeParse(value).success,
        validationParams('INVALID_EMAIL', 'Invalid email address'),
    );

export const registerSchema = z.object({
    email,
    password: z
        .string()
        .refine(
            (value) => value.length >= 8 && value.length <= 128,
            validationParams('PASSWORD_LENGTH', 'Password must be between 8 and 128 characters'),
        ),
    name: z
        .string()
        .refine(
            (value) => value.length <= 50,
            validationParams('DISPLAY_NAME_LENGTH', 'Display name must be 50 characters or fewer'),
        )
        .optional()
        .transform((v) => (v || '').trim()),
    cguAccepted: z.custom<true>(
        (value) => value === true,
        validationParams('TERMS_REQUIRED', 'You must accept the CGU to register.'),
    ),
    is16OrOlder: z.custom<true>(
        (value) => value === true,
        validationParams('AGE_REQUIRED', 'You must confirm you are 16 or older to register.'),
    ),
});

export const loginSchema = z.object({
    email,
    password: z
        .string()
        .refine(
            (value) => value.length > 0,
            validationParams('CREDENTIALS_REQUIRED', 'Email and password required'),
        ),
});

/** Profile edits (the email changes through an emailed code, see the API docs). */
export const profileSchema = z.object({
    name: z
        .string()
        .refine(
            (value) => value.length <= 50,
            validationParams('DISPLAY_NAME_LENGTH', 'Display name must be 50 characters or fewer'),
        )
        .transform((v) => v.trim()),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;

export { youtubeVideoId, youtubeChannels } from './youtube';

export {
    API_ERROR_CODES,
    isApiErrorCode,
    validationErrorCode,
    validationParams,
    type ApiErrorCode,
} from './apiErrors';
