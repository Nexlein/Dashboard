import { expect, it } from 'vitest';
import { apiErrorCode } from '../src/apiErrors';

it.each([
    ['OpenWeather is not connected. Configure it in Services.', 'OPENWEATHER_NOT_CONNECTED'],
    ['YouTube is temporarily unavailable.', 'YOUTUBE_UNAVAILABLE'],
    ['Refresh unavailable; showing saved publications.', 'YOUTUBE_SAVED_FEED'],
    ['Display name must be 50 characters or fewer', 'DISPLAY_NAME_LENGTH'],
    ['Unknown widget: unsupported in service weather', 'WIDGET_UNKNOWN'],
    ['GitHub account no longer works. Reconnect it in Services.', 'ACCOUNT_CONNECTION_EXPIRED'],
    ['Unknown provider diagnostic', 'REQUEST_FAILED'],
    ['constructor', 'REQUEST_FAILED'],
    ['__proto__', 'REQUEST_FAILED'],
])('exposes a stable code for %s', (message, code) => {
    expect(apiErrorCode(message)).toBe(code);
});
