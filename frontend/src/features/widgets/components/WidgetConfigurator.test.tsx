import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@/test-utils';
import { makeAbout, makeService, mockApi } from '@/test/fixtures';
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
        mockApi({
            'GET /services': { body: [makeService()] },
            'GET /about.json': { body: makeAbout() },
        });
        const dialog = await openDialog();

        expect(within(dialog).getByRole('combobox', { name: 'Widget Type' })).toBeDisabled();
        await choose(dialog, 'Service', 'Crypto');

        expect(await within(dialog).findByText('CoinGecko is not connected')).toBeInTheDocument();
        expect(within(dialog).getByRole('combobox', { name: 'Widget Type' })).toBeDisabled();
        expect(within(dialog).getByRole('button', { name: 'Add to Dashboard' })).toBeDisabled();
    });

    it('creates the configured widget with its default size', async () => {
        const fetchMock = mockApi({
            'GET /about.json': { body: makeAbout() },
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

    it('creates a single-company profile with visible period choices and resets parameters when switching types', async () => {
        const fetchMock = mockApi({
            'GET /about.json': { body: makeAbout() },
            'GET /services': {
                body: [
                    makeService({ name: 'stocks', displayName: 'Twelve Data', connected: true }),
                ],
            },
            'POST /widgets': (init) => ({ id: 99, ...JSON.parse(String(init.body)) }),
        });
        const dialog = await openDialog();
        await choose(dialog, 'Service', 'Stock Market');
        await choose(dialog, 'Widget Type', 'Stock Comparison Chart');
        fireEvent.click(within(dialog).getByRole('button', { name: '+ Apple (AAPL)' }));
        fireEvent.click(within(dialog).getByRole('radio', { name: '5 years' }));
        await choose(dialog, 'Widget Type', 'Stock Profile');
        expect(within(dialog).queryByRole('button', { name: 'Remove AAPL' })).toBeNull();
        expect(within(dialog).getByRole('radio', { name: '1 month' })).toBeChecked();
        fireEvent.click(within(dialog).getByRole('button', { name: '+ NVIDIA (NVDA)' }));
        expect(within(dialog).getByLabelText('Search stocks')).toBeDisabled();
        fireEvent.click(within(dialog).getByRole('radio', { name: '5 years' }));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Add to Dashboard' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
        expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
            widgetName: 'stock_profile',
            params: { symbols: 'NVDA', period: '5Y' },
            layout: { x: 0, y: 0, w: 4, h: 4 },
        });
    });

    it('rejects a refresh rate under one minute', async () => {
        mockApi({
            'GET /about.json': { body: makeAbout() },
            'GET /services': { body: [connectedCrypto] },
        });
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
            'GET /about.json': { body: makeAbout() },
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

    it('offers only the widgets /about.json declares, with the params it declares', async () => {
        const fetchMock = mockApi({
            'GET /services': { body: [connectedCrypto] },
            'GET /about.json': {
                body: makeAbout([
                    {
                        name: 'crypto',
                        widgets: [
                            {
                                name: 'crypto_price',
                                description: 'Price',
                                // `currency` is gone; `threshold` is unknown to the frontend.
                                params: [
                                    { name: 'coin', type: 'string' },
                                    { name: 'threshold', type: 'integer' },
                                ],
                            },
                            { name: 'crypto_heatmap', description: 'Not displayable', params: [] },
                        ],
                    },
                    { name: 'unknown_service', widgets: [] },
                ]),
            },
            'POST /widgets': (init) => ({ id: 9, ...JSON.parse(String(init.body)) }),
        });
        const dialog = await openDialog();

        const serviceTrigger = within(dialog).getByRole('combobox', { name: 'Service' });
        await waitFor(() => expect(serviceTrigger).toBeEnabled());
        fireEvent.pointerDown(serviceTrigger, { button: 0, pointerType: 'mouse' });
        expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
            'Crypto',
        ]);
        fireEvent.click(screen.getByRole('option', { name: 'Crypto' }));

        // A single displayable widget is selected at once.
        expect(within(dialog).queryByLabelText('Currency')).toBeNull();
        fireEvent.change(within(dialog).getByLabelText('CoinGecko Coin ID'), {
            target: { value: 'bitcoin' },
        });
        const add = within(dialog).getByRole('button', { name: 'Add to Dashboard' });
        expect(add).toBeDisabled();
        const threshold = within(dialog).getByLabelText('Threshold');
        expect(threshold).toHaveAttribute('type', 'number');
        fireEvent.change(threshold, { target: { value: '5' } });
        fireEvent.click(add);

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
        expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
            widgetName: 'crypto_price',
            params: { coin: 'bitcoin', threshold: '5' },
        });
    });

    it('says when the available services cannot be loaded', async () => {
        mockApi({
            'GET /services': { body: [connectedCrypto] },
            'GET /about.json': { status: 503, body: { error: 'Service unavailable' } },
        });
        const dialog = await openDialog();

        expect(await within(dialog).findByRole('alert')).toHaveTextContent('Service unavailable');
        expect(within(dialog).getByRole('combobox', { name: 'Service' })).toBeDisabled();
    });
});
