import type { ApiErrorCode } from 'shared';
import commonEn from './locales/en/common.json';
import commonFr from './locales/fr/common.json';
import accountEn from './locales/en/account.json';
import accountFr from './locales/fr/account.json';
import authEn from './locales/en/auth.json';
import authFr from './locales/fr/auth.json';
import adminEn from './locales/en/admin.json';
import adminFr from './locales/fr/admin.json';
import servicesEn from './locales/en/services.json';
import servicesFr from './locales/fr/services.json';
import widgetsEn from './locales/en/widgets.json';
import widgetsFr from './locales/fr/widgets.json';
import marketsEn from './locales/en/markets.json';
import marketsFr from './locales/fr/markets.json';
import githubEn from './locales/en/github.json';
import githubFr from './locales/fr/github.json';
import chatbotEn from './locales/en/chatbot.json';
import chatbotFr from './locales/fr/chatbot.json';
import youtubeEn from './locales/en/youtube.json';
import youtubeFr from './locales/fr/youtube.json';
import weatherEn from './locales/en/weather.json';
import weatherFr from './locales/fr/weather.json';
import legalEn from './locales/en/legal.json';
import legalFr from './locales/fr/legal.json';
import errorsEn from './locales/en/errors.json';
import errorsFr from './locales/fr/errors.json';

export const defaultNS = 'common';
export const resources = {
    en: {
        common: commonEn,
        account: accountEn,
        auth: authEn,
        admin: adminEn,
        services: servicesEn,
        widgets: widgetsEn,
        markets: marketsEn,
        github: githubEn,
        chatbot: chatbotEn,
        youtube: youtubeEn,
        weather: weatherEn,
        legal: legalEn,
        errors: errorsEn satisfies Record<ApiErrorCode, string>,
    },
    fr: {
        common: commonFr,
        account: accountFr,
        auth: authFr,
        admin: adminFr,
        services: servicesFr,
        widgets: widgetsFr,
        markets: marketsFr,
        github: githubFr,
        chatbot: chatbotFr,
        youtube: youtubeFr,
        weather: weatherFr,
        legal: legalFr,
        errors: errorsFr satisfies Record<ApiErrorCode, string>,
    },
} as const;
