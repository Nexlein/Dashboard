import { expect, it } from 'vitest';
import i18n from './index';
import { getErrorMessage, notice } from './errors';
import { weatherDescription } from './weather';
import { fetchClient, ApiError } from '@/lib/apiClient';
import { vi } from 'vitest';

it('keeps API codes, cooldown and status until the translated message is rendered', async () => {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    error: 'A provider-specific diagnostic',
                    code: 'STOCK_CREDITS_PENDING',
                }),
                { status: 429, headers: { 'Retry-After': '45' } },
            ),
        ),
    );
    try {
        const failure = await fetchClient('/widgets/1/data').catch((error: unknown) => error);
        expect(failure).toBeInstanceOf(ApiError);
        expect(failure).toMatchObject({
            code: 'STOCK_CREDITS_PENDING',
            status: 429,
            retryAfter: 45,
        });
        expect(getErrorMessage(failure)).toContain('Twelve Data credits');
        await i18n.changeLanguage('fr');
        expect(getErrorMessage(failure)).toContain('crédits Twelve Data');
        expect(getErrorMessage(notice('account:profileUpdated'))).toBe('Profil mis à jour');
    } finally {
        vi.unstubAllGlobals();
    }
});

it('localizes old cached weather by icon and handles unrecognized IDs', async () => {
    await i18n.changeLanguage('fr');
    expect(weatherDescription(undefined, '01d')).toBe('Ciel dégagé');
    expect(weatherDescription(804, '04n')).toBe('Ciel couvert');
    expect(weatherDescription(12345, '')).toBe('Conditions météo indisponibles');
});
