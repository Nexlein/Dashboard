import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, updateMeSchema } from '../src/index';

describe('Shared Schemas', () => {
    describe('registerSchema', () => {
        it('should validate correct registration data', () => {
            const data = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
                cguAccepted: true,
                is16OrOlder: true,
            };
            const result = registerSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should fail if email is invalid', () => {
            const data = {
                email: 'invalid-email',
                password: 'password123',
                name: 'Test User',
                cguAccepted: true,
                is16OrOlder: true,
            };
            const result = registerSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should fail if CGU not accepted', () => {
            const data = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
                cguAccepted: false,
                is16OrOlder: true,
            };
            const result = registerSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe('loginSchema', () => {
        it('should validate correct login data', () => {
            const data = {
                email: 'test@example.com',
                password: 'password123',
            };
            const result = loginSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });

    describe('email', () => {
        it('trims surrounding spaces before validating', () => {
            const result = loginSchema.safeParse({ email: '  ada@example.com ', password: 'x' });
            expect(result.success && result.data.email).toBe('ada@example.com');
        });

        it('keeps the custom message for an invalid address', () => {
            const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
            expect(result.error?.issues[0].message).toBe('Invalid email address');
        });

        it('rejects addresses longer than 254 characters', () => {
            const email = `${'a'.repeat(64)}@${'b'.repeat(186)}.com`;
            expect(email.length).toBe(255);
            expect(loginSchema.safeParse({ email, password: 'x' }).success).toBe(false);
        });

        it('stays optional on profile updates', () => {
            expect(updateMeSchema.safeParse({}).success).toBe(true);
            expect(updateMeSchema.safeParse({ email: ' new@example.com' }).data?.email).toBe(
                'new@example.com',
            );
        });
    });

    describe('updateMeSchema', () => {
        it('should validate partial updates', () => {
            const data = {
                name: 'New Name',
            };
            const result = updateMeSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });
});
