import { isApiErrorCode, type ApiErrorCode } from 'shared';

/** Preserve the API diagnostic while requiring a language-independent code. */
export function apiError(message: string, code: ApiErrorCode) {
    return { error: message, code };
}

/** Provider diagnostics without a recognised code keep the caller's fixed fallback. */
export function errorCode(error: unknown, fallback: ApiErrorCode): ApiErrorCode {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    return isApiErrorCode(code) ? code : fallback;
}
