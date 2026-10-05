import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@/test-utils';
import { makeService, mockApi } from '@/test/fixtures';
import { WidgetConfigurator } from './WidgetConfigurator';

const connectedCrypto = makeService({ connected: true, keyHint: 'a1b2' });

function openDialog() {
    render(<WidgetConfigurator />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Widget' }));
    return screen.findByRole('dialog', { name: 'Add New Widget' });
}

/** Radix Select opens on pointer down. */
async function choose(dialog: HTMLElement, label: string, option: string) {
    const trigger = within(dialog).getByRole('combobox', { name: label });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
    fireEvent.click(await screen.findByRole('option', { name: option }));
}

afterEach(() => vi.unstubAllGlobals());

describe('WidgetConfigurator', () => {
    it('asks to connect a service before adding its widgets', async () => {
        mockApi({ 'GET /services': { body: [makeService()] } });
        const dialog = await openDialog();

        await choose(dialog, 'Service', 'Crypto');

        expect(await within(dialog).findByText('CoinGecko is not connected')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Add to Dashboard' })).toBeDisabled();
    });

    it('creates the configured widget with its default size', async () => {
        const fetchMock = mockApi({
            'GET /services': { body: [connectedCrypto] },
            'POST /widgets': (init) => ({
                id: 9,
                ...JSON.parse(String(init.body)),
            }),
        });
        const dialog = await openDialog();

        await choose(dialog, 'Service', 'Crypto');
        await choose(dialog, 'Widget Type', 'Price & Market Stats');
        const add = within(dialog).getByRole('button', { name: 'Add to Dashboard' });
        expect(add).toBeDisabled();

        fireEvent.change(within(dialog).getByLabelText('CoinGecko Coin ID'), {
            target: { value: 'bitcoin' },
        });
        fireEvent.change(within(dialog).getByLabelText('Currency'), { target: { value: 'eur' } });
        fireEvent.change(within(dialog).getByLabelText('Refresh Rate (seconds)'), {
            target: { value: '120' },
        });
        fireEvent.click(add);

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
        expect(JSON.parse(String(post?.[1]?.body))).toEqual({
            serviceName: 'crypto',
            widgetName: 'crypto_price',
            params: { coin: 'bitcoin', currency: 'eur' },
            refreshRate: 120,
            layout: { x: 0, y: 0, w: 3, h: 2 },
        });
    });

    it('rejects a refresh rate under one minute', async () => {
        mockApi({ 'GET /services': { body: [connectedCrypto] } });
        const dialog = await openDialog();
        await choose(dialog, 'Service', 'Crypto');
        await choose(dialog, 'Widget Type', 'Price & Market Stats');
        fireEvent.change(within(dialog).getByLabelText('CoinGecko Coin ID'), {
            target: { value: 'bitcoin' },
        });
        fireEvent.change(within(dialog).getByLabelText('Currency'), { target: { value: 'eur' } });
        fireEvent.change(within(dialog).getByLabelText('Refresh Rate (seconds)'), {
            target: { value: '30' },
        });

        expect(within(dialog).getByRole('button', { name: 'Add to Dashboard' })).toBeDisabled();
    });

    it('shows the API error and keeps the dialog open', async () => {
        mockApi({
            'GET /services': { body: [connectedCrypto] },
            'POST /widgets': { status: 400, body: { error: 'Unknown coin: bitcon' } },
        });
        const dialog = await openDialog();
        await choose(dialog, 'Service', 'Crypto');
        await choose(dialog, 'Widget Type', 'Price & Market Stats');
        fireEvent.change(within(dialog).getByLabelText('CoinGecko Coin ID'), {
            target: { value: 'bitcon' },
        });
        fireEvent.change(within(dialog).getByLabelText('Currency'), { target: { value: 'eur' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Add to Dashboard' }));

        expect(await within(dialog).findByText('Unknown coin: bitcon')).toBeInTheDocument();
    });
});
