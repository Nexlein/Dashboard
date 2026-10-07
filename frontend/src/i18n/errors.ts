import type { ApiErrorCode } from 'shared';
import i18n from './index';
import { resources } from './resources';

type CodedError = { code?: string; status?: number };

function isTranslatedErrorCode(code: unknown): code is ApiErrorCode {
    return typeof code === 'string' && Object.hasOwn(resources.en.errors, code);
}

type NoticeKey =
    | 'auth:githubConsent'
    | 'auth:genericError'
    | 'auth:newCodeSent'
    | 'account:profileUpdated'
    | 'account:emailUpdated'
    | 'widgets:channelInvalid'
    | 'common:downloadError'
    | 'common:deleteFreshSession'
    | 'common:deleteError'
    | 'services:alreadyLinked'
    | 'services:linkFailed';
export type LocalizedNotice = { notice: NoticeKey };
export const notice = (key: NoticeKey): LocalizedNotice => ({ notice: key });
export const translateNotice = (value: LocalizedNotice): string => i18n.t(value.notice);

/** Keep errors as objects until render time, so cached failures change language too. */
export function getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'notice' in error) {
        return translateNotice(error as LocalizedNotice);
    }
    const code = error && typeof error === 'object' ? (error as CodedError).code : undefined;
    const aliases: Record<string, keyof typeof resources.en.errors> = {
        USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'USER_ALREADY_EXISTS',
        PASSWORD_TOO_SHORT: 'PASSWORD_LENGTH',
        PASSWORD_TOO_LONG: 'PASSWORD_LENGTH',
        INVALID_PASSWORD: 'INVALID_EMAIL_OR_PASSWORD',
        SESSION_NOT_FRESH: 'SESSION_EXPIRED',
        INVALID_ORIGIN: 'FORBIDDEN',
        MISSING_OR_NULL_ORIGIN: 'FORBIDDEN',
        SOCIAL_ACCOUNT_ALREADY_LINKED: 'RESOURCE_EXISTS',
        LINKED_ACCOUNT_ALREADY_EXISTS: 'RESOURCE_EXISTS',
        FAILED_TO_GET_SESSION: 'AUTHENTICATION_REQUIRED',
    };
    if (code && Object.hasOwn(aliases, code)) return i18n.t(`errors:${aliases[code]}`);
    if (isTranslatedErrorCode(code)) {
        return i18n.t(`errors:${code}`);
    }
    if (code?.startsWith('YOU_ARE_NOT_ALLOWED_')) return i18n.t('errors:FORBIDDEN');
    const status = error && typeof error === 'object' ? (error as CodedError).status : undefined;
    if (status === 401) return i18n.t('errors:AUTHENTICATION_REQUIRED');
    if (status === 403) return i18n.t('errors:FORBIDDEN');
    return i18n.t('errors:REQUEST_FAILED');
}
