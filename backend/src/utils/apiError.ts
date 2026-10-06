import { apiErrorCode } from 'shared';

/** Add a language-independent code while preserving the existing API message. */
export function apiError(message: string, code = apiErrorCode(message)) {
    return { error: message, code };
}
