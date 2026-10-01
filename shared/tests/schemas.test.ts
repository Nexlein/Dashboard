import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, updateMeSchema } from '../src/index';

describe('Shared Schemas', () => {
    describe('registerSchema', () => {
        it('should validate correct registration data', () => {
            const data = {
                email: 'test@example.com',
                password: 'password123',
                displayName: 'Test User',
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
                displayName: 'Test User',
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
                displayName: 'Test User',
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

    describe('updateMeSchema', () => {
        it('should validate partial updates', () => {
            const data = {
                displayName: 'New Name',
            };
            const result = updateMeSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });
});
