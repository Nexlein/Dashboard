import i18n from './index';
import { resources } from './resources';

/** Provider IDs: https://openweathermap.org/api/weather-conditions. */
export function weatherDescription(conditionCode: number | null | undefined, icon: string) {
    const code = String(conditionCode);
    if (Object.hasOwn(resources.en.weather.conditions, code)) {
        return i18n.t(`weather:conditions.${code as keyof typeof resources.en.weather.conditions}`);
    }
    // Older cached responses lack the condition ID; icons still describe the broad condition.
    switch (icon.slice(0, 2)) {
        case '01':
            return i18n.t('weather:clear');
        case '02':
            return i18n.t('weather:fewClouds');
        case '03':
            return i18n.t('weather:scatteredClouds');
        case '04':
            return i18n.t('weather:brokenClouds');
        case '09':
        case '10':
            return i18n.t('weather:rain');
        case '11':
            return i18n.t('weather:thunderstorm');
        case '13':
            return i18n.t('weather:snow');
        case '50':
            return i18n.t('weather:mist');
        default:
            return i18n.t('weather:unknown');
    }
}
