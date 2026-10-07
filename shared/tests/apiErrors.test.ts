import { expect, it } from 'vitest';
import { isApiErrorCode, validationErrorCode, validationParams } from '../src/apiErrors';
import { loginSchema, profileSchema, registerSchema } from '../src/index';

it('recognises only declared API codes', () => {
    expect(isApiErrorCode('CITY_NOT_FOUND')).toBe(true);
    for (const unknown of ['City not found', 'constructor', '__proto__', undefined]) {
        expect(isApiErrorCode(unknown)).toBe(false);
    }
});

it('keeps a validation code independent of the diagnostic wording', () => {
    const issue = { code: 'custom', params: validationParams('INVALID_EMAIL', 'Reworded').params };
    expect(validationErrorCode(issue)).toBe('INVALID_EMAIL');
    expect(validationErrorCode({ code: 'invalid_type' })).toBe('VALIDATION_ERROR');
    expect(validationErrorCode({ code: 'custom', params: { apiErrorCode: 'unknown' } })).toBe(
        'VALIDATION_ERROR',
    );
});

it.each([
    [{ email: 'invalid' }, 'INVALID_EMAIL'],
    [{ password: 'short' }, 'PASSWORD_LENGTH'],
    [{ name: 'a'.repeat(51) }, 'DISPLAY_NAME_LENGTH'],
    [{ cguAccepted: false }, 'TERMS_REQUIRED'],
    [{ is16OrOlder: false }, 'AGE_REQUIRED'],
])('attaches the registration validation code at its source', (overrides, code) => {
    const result = registerSchema.safeParse({
        email: 'ada@example.com',
        password: 'password123',
        name: 'Ada',
        cguAccepted: true,
        is16OrOlder: true,
        ...overrides,
    });
    expect(result.success).toBe(false);
    expect(validationErrorCode(result.error?.issues[0])).toBe(code);
});

it('codes login and profile validation without reading English messages', () => {
    expect(
        validationErrorCode(
            loginSchema.safeParse({ email: 'ada@example.com', password: '' }).error?.issues[0],
        ),
    ).toBe('CREDENTIALS_REQUIRED');
    expect(
        validationErrorCode(profileSchema.safeParse({ name: 'a'.repeat(51) }).error?.issues[0]),
    ).toBe('DISPLAY_NAME_LENGTH');
});
