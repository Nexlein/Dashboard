import type { TFunction } from 'i18next';
import i18n from './index';
import { resources } from './resources';

/** Provider IDs: https://openweathermap.org/api/weather-conditions. */
export function weatherDescription(
    conditionCode: number | null | undefined,
    icon: string,
    translate: TFunction<'weather'> = i18n.getFixedT(null, 'weather'),
) {
    const code = String(conditionCode);
    if (Object.hasOwn(resources.en.weather.conditions, code)) {
        return translate(`conditions.${code as keyof typeof resources.en.weather.conditions}`);
    }
    // Older cached responses lack the condition ID; icons still describe the broad condition.
    switch (icon.slice(0, 2)) {
        case '01':
            return translate('clear');
        case '02':
            return translate('fewClouds');
        case '03':
            return translate('scatteredClouds');
        case '04':
            return translate('brokenClouds');
        case '09':
        case '10':
            return translate('rain');
        case '11':
            return translate('thunderstorm');
        case '13':
            return translate('snow');
        case '50':
            return translate('mist');
        default:
            return translate('unknown');
    }
}
