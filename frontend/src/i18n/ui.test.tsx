import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import i18n from './index';
import { formatDate, formatNumber } from './format';
import { getErrorMessage } from './errors';
import { resources } from './resources';
import AuthPage from '@/pages/AuthPage';
import { CurrentWeather, Forecast } from '@/features/widgets/catalog/WeatherWidgets';
import { StockProfileWidget } from '@/features/widgets/catalog/StockProfileWidget';
import { ChatbotWidget } from '@/features/widgets/catalog/ChatbotWidget';
import WidgetRenderer from '@/features/widgets/components/WidgetRenderer';
import { useWidgetCatalog } from '@/features/widgets/hooks/useWidgetCatalog';
import { getWidgetTitle } from '@/features/widgets/lib/widgets';
import { makeWidget, mockApi } from '@/test/fixtures';
import { CHAT_HISTORY_PREFIX } from '@/lib/auth';

const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={['/register']}>{children}</MemoryRouter>
        </QueryClientProvider>
    </I18nextProvider>
);
const switchTo = async (language: 'fr' | 'en') => {
    await act(async () => {
        await i18n.changeLanguage(language);
    });
};
afterEach(() => {
    client.clear();
    vi.unstubAllGlobals();
    localStorage.clear();
});

it('switches a registration form without losing credentials or consent', async () => {
    render(<AuthPage />, { wrapper });
    // A language change must preserve the current form and accepted declarations.
    fireEvent.change(screen.getByLabelText('Email address'), {
        target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secret123' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /terms of service/i }));
    await switchTo('fr');
    expect(screen.getByRole('checkbox', { name: /conditions générales/i })).toBeChecked();
    expect(screen.getByRole('link', { name: /conditions générales/i })).toHaveAttribute(
        'href',
        '/cgu',
    );
    expect(screen.getByLabelText('Adresse e-mail')).toHaveValue('ada@example.com');
    expect(screen.getByLabelText('Mot de passe')).toHaveValue('Secret123');
    expect(screen.getByRole('button', { name: 'Créer mon compte' })).toBeInTheDocument();
    await switchTo('en');
    expect(screen.getByLabelText('Email address')).toHaveValue('ada@example.com');
});

it('refreshes a loaded catalog and cached titles without fetching again or changing IDs', async () => {
    const fetch = mockApi({
        'GET /about.json': {
            body: {
                server: {
                    services: [
                        {
                            name: 'weather',
                            widgets: [
                                {
                                    name: 'current_weather',
                                    description: 'Current weather',
                                    params: [{ name: 'city', type: 'string' }],
                                },
                            ],
                        },
                    ],
                },
            },
        },
    });
    const { result } = renderHook(() => useWidgetCatalog(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].widgets[0].name).toBe('Current Temperature');
    const saved = makeWidget({
        serviceName: 'weather',
        widgetName: 'current_weather',
        params: { city: 'Paris' },
    });
    await switchTo('fr');
    expect(result.current.data?.[0].name).toBe('Météo');
    expect(result.current.data?.[0].widgets[0].params[0].label).toBe('Nom de la ville');
    expect(result.current.data?.[0].widgets[0].id).toBe('current_weather');
    expect(getWidgetTitle(saved)).toBe('Météo');
    expect(saved.params).toEqual({ city: 'Paris' });
    expect(fetch).toHaveBeenCalledOnce();
});

it('translates an already displayed API failure without refetching', async () => {
    const fetch = mockApi({
        'GET /widgets/21/data': {
            status: 409,
            body: {
                error: 'OpenWeather is not connected. Configure it in Services.',
                code: 'OPENWEATHER_NOT_CONNECTED',
            },
        },
    });
    render(
        <WidgetRenderer
            widget={makeWidget({
                id: 21,
                serviceName: 'weather',
                widgetName: 'current_weather',
                refreshRate: 600,
            })}
        />,
        { wrapper },
    );
    await screen.findByText(resources.en.errors.OPENWEATHER_NOT_CONNECTED);
    expect(screen.getByRole('link', { name: 'Open Services' })).toHaveAttribute(
        'href',
        '/services',
    );
    await switchTo('fr');
    expect(screen.getByText(resources.fr.errors.OPENWEATHER_NOT_CONNECTED)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ouvrir Services' })).toHaveAttribute(
        'href',
        '/services',
    );
    expect(fetch).toHaveBeenCalledOnce();
});

it('localizes weather conditions, image descriptions, numbers and forecast days', async () => {
    const props = { widget: makeWidget(), onPeriodChange: vi.fn(), periodUpdating: false };
    const current = {
        location: { name: 'Paris', country: 'FR' },
        temperature: 19,
        feelsLike: 18,
        humidity: 70,
        windSpeed: 3.2,
        condition: 'light rain',
        conditionCode: 500,
        icon: '10d',
    };
    render(
        <>
            <CurrentWeather {...props} data={current} />
            <Forecast
                {...props}
                data={{
                    location: current.location,
                    days: [
                        {
                            date: '2026-10-06',
                            min: 12,
                            max: 19,
                            condition: 'clear sky',
                            conditionCode: 800,
                            icon: '01d',
                        },
                    ],
                }}
            />
        </>,
        { wrapper },
    );
    expect(screen.getByRole('img', { name: 'Light rain' })).toBeInTheDocument();
    await switchTo('fr');
    expect(screen.getByRole('img', { name: 'Pluie légère' })).toBeInTheDocument();
    expect(screen.getByText('3,2 m/s')).toBeInTheDocument();
    expect(screen.getByText('mar.')).toBeInTheDocument();
    expect(screen.getAllByText('Paris, FR', { selector: 'p' })).toHaveLength(2);
});

it('localizes period labels while sending the original API value', async () => {
    const onPeriodChange = vi.fn();
    render(
        <StockProfileWidget
            widget={makeWidget()}
            periodUpdating={false}
            onPeriodChange={onPeriodChange}
            data={{
                period: '1M',
                series: [
                    {
                        symbol: 'AAPL',
                        name: 'Apple Inc',
                        currency: 'USD',
                        exchange: 'NASDAQ',
                        logo: null,
                        currentPrice: 120,
                        change: 1,
                        prices: [{ timestamp: 1000, price: 120 }],
                    },
                ],
            }}
        />,
        { wrapper },
    );
    await switchTo('fr');
    fireEvent.click(screen.getByRole('button', { name: '5A' }));
    expect(onPeriodChange).toHaveBeenCalledWith('5Y');
    expect(screen.getByText('Apple Inc')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /AAPL/ })).toBeInTheDocument();
});

it('switches the chat greeting while preserving user and model content and stored history', async () => {
    const widget = makeWidget({
        id: 99,
        serviceName: 'chatbot',
        widgetName: 'ai_chat',
        params: { model: 'llama3' },
    });
    const history = [
        { role: 'assistant', content: resources.en.chatbot.greeting },
        { role: 'user', content: 'Please keep this text' },
        { role: 'assistant', content: 'Réponse du modèle' },
    ];
    localStorage.setItem(`${CHAT_HISTORY_PREFIX}99`, JSON.stringify(history));
    render(<ChatbotWidget widget={widget} />, { wrapper });
    const stored = localStorage.getItem(`${CHAT_HISTORY_PREFIX}99`);
    await switchTo('fr');
    expect(screen.getByText(resources.fr.chatbot.greeting)).toBeInTheDocument();
    expect(screen.getByText('Please keep this text')).toBeInTheDocument();
    expect(screen.getByText('Réponse du modèle')).toBeInTheDocument();
    expect(localStorage.getItem(`${CHAT_HISTORY_PREFIX}99`)).toBe(stored);
});

it('formats dates and counts in the chosen locale and safely handles unknown errors', async () => {
    const date = new Date('2026-09-17T12:00:00Z');
    await switchTo('fr');
    expect(formatDate(date, { dateStyle: 'long', timeZone: 'UTC' })).toBe('17 septembre 2026');
    expect(formatNumber(1234.5)).toBe(new Intl.NumberFormat('fr').format(1234.5));
    expect(getErrorMessage(new Error('Untranslated provider diagnostic'))).toBe(
        resources.fr.errors.REQUEST_FAILED,
    );
    expect(getErrorMessage({ code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' })).toBe(
        resources.fr.errors.USER_ALREADY_EXISTS,
    );
    await switchTo('en');
    expect(formatDate(date, { dateStyle: 'long', timeZone: 'UTC' })).toBe('September 17, 2026');
    expect(i18n.t('youtube:channels', { count: 1 })).toBe('1 channel');
    expect(i18n.t('youtube:channels', { count: 2 })).toBe('2 channels');
});
