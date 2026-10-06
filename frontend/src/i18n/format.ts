import i18n from './index';
import { FALLBACK_LANGUAGE } from './language';

export const locale = () => i18n.resolvedLanguage ?? FALLBACK_LANGUAGE;

export function formatDate(value: Date | number, options: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat(locale(), options).format(value);
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}) {
    return new Intl.NumberFormat(locale(), options).format(value);
}

/** API values stay unchanged; only their labels are localized. */
export function formatPeriod(period: string) {
    switch (period) {
        case '1W':
            return i18n.t('markets:week');
        case '1M':
            return i18n.t('markets:month');
        case '3M':
            return i18n.t('markets:threeMonths');
        case '1Y':
            return i18n.t('markets:year');
        case '5Y':
            return i18n.t('markets:fiveYears');
        case 'ALL':
            return i18n.t('markets:all');
        default:
            return period;
    }
}
