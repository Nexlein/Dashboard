import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as _originalRender, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ServicesPage from './ServicesPage';
import { fetchServices } from '@/features/services/lib/services';

vi.mock('@/features/services/lib/services', () => ({
    fetchServices: vi.fn(),
    connectService: vi.fn(),
    disconnectService: vi.fn(),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const customRender = (ui: React.ReactElement, path = '/services') => {
    return _originalRender(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
        </QueryClientProvider>,
    );
};
describe('ServicesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows a connected service without exposing its API key', async () => {
        vi.mocked(fetchServices).mockResolvedValue([
            {
                name: 'weather',
                displayName: 'OpenWeather',
                description: 'Current weather and forecasts',
                configurable: true,
                connectionType: 'apiKey',
                credentialLabel: 'OpenWeather API key',
                documentationUrl: 'https://home.openweathermap.org/api_keys',
                connected: true,
                keyHint: 'a1b2',
                verifiedAt: '2026-09-21T12:00:00.000Z',
            },
        ]);

        customRender(<ServicesPage />);

        await waitFor(() => expect(screen.getByText('OpenWeather')).not.toBeNull());
        expect(screen.getByText('API key verified')).not.toBeNull();
        expect(screen.getByText(/a1b2/)).not.toBeNull();
        expect(screen.queryByDisplayValue(/a1b2/)).toBeNull();
    });

    it.each([
        ['account_already_linked_to_different_user', 'already linked to another Dashboard account'],
        ['invalid_code', 'Linking the account failed'],
    ])('explains a failed GitHub linking (%s)', async (code, message) => {
        vi.mocked(fetchServices).mockResolvedValue([]);

        customRender(<ServicesPage />, `/services?error=${code}`);

        expect((await screen.findByRole('alert')).textContent).toContain(message);
    });
});
