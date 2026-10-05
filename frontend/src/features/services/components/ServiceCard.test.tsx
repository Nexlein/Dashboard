import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/test-utils';
import { makeService, mockApi } from '@/test/fixtures';
import { ServiceCard } from './ServiceCard';

function renderCard(service = makeService()) {
    const props = {
        service,
        onConnect: vi.fn().mockResolvedValue(undefined),
        onDisconnect: vi.fn().mockResolvedValue(undefined),
        setError: vi.fn(),
    };
    render(<ServiceCard {...props} />);
    return props;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('ServiceCard with an API key service', () => {
    it('connects with the typed key and clears the field', async () => {
        const { onConnect } = renderCard();
        const input = screen.getByLabelText('CoinGecko Demo API key');
        const connect = screen.getByRole('button', { name: 'Connect' });
        expect(screen.getByRole('img', { name: 'CoinGecko logo' })).toHaveAttribute(
            'src',
            'https://www.coingecko.com/favicon.ico',
        );
        expect(connect).toBeDisabled();

        fireEvent.change(input, { target: { value: '  demo-key  ' } });
        fireEvent.click(connect);

        await waitFor(() => expect(onConnect).toHaveBeenCalledWith('crypto', '  demo-key  '));
        await waitFor(() => expect(input).toHaveValue(''));
    });

    it('reports a failed connection', async () => {
        const props = renderCard();
        props.onConnect.mockRejectedValue(new Error('Invalid API key'));
        fireEvent.change(screen.getByLabelText('CoinGecko Demo API key'), {
            target: { value: 'bad' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
        await waitFor(() => expect(props.setError).toHaveBeenCalledWith('Invalid API key'));
    });

    it('shows only the key hint once connected, and lets the key be replaced', () => {
        renderCard(makeService({ connected: true, keyHint: 'a1b2' }));
        expect(screen.getByText('Key ending in ••••a1b2')).toBeInTheDocument();
        expect(screen.queryByLabelText('CoinGecko Demo API key')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Replace key' }));
        expect(screen.getByLabelText('CoinGecko Demo API key')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();
    });

    it('disconnects only after confirmation', async () => {
        const confirm = vi.fn(() => false);
        vi.stubGlobal('confirm', confirm);
        const { onDisconnect } = renderCard(makeService({ connected: true, keyHint: 'a1b2' }));

        fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
        expect(confirm).toHaveBeenCalledWith('Disconnect CoinGecko?');
        expect(onDisconnect).not.toHaveBeenCalled();

        confirm.mockReturnValue(true);
        fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
        await waitFor(() => expect(onDisconnect).toHaveBeenCalledWith('crypto'));
    });
});

describe('ServiceCard with an OAuth service', () => {
    const github = makeService({
        name: 'github',
        displayName: 'GitHub',
        connectionType: 'oauth',
        credentialLabel: null,
        documentationUrl: null,
        connected: false,
        provider: 'github-service',
        accounts: [],
    });
    const twoAccounts = {
        ...github,
        connected: true,
        accounts: [
            { id: 12, login: 'octocat', avatarUrl: 'https://avatars/1' },
            { id: 13, login: null, avatarUrl: null },
        ],
    };

    it('connects an account through the service provider, apart from sign-in', async () => {
        const fetchMock = mockApi({
            'POST /api/auth/link-social': {
                body: { url: 'https://github.com/login/oauth/authorize?x=1', redirect: false },
            },
        });
        const location = { href: 'http://localhost/services', origin: 'http://localhost' };
        vi.stubGlobal('location', location);
        renderCard(github);

        fireEvent.click(screen.getByRole('button', { name: 'Connect a GitHub account' }));

        await waitFor(() =>
            expect(location.href).toBe('https://github.com/login/oauth/authorize?x=1'),
        );
        expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
            provider: 'github-service',
            callbackURL: 'http://localhost/services?linked=github',
        });
    });

    it('reports an error when the linking flow cannot start', async () => {
        mockApi({
            'POST /api/auth/link-social': { status: 401, body: { message: 'Unauthorized' } },
        });
        const { setError } = renderCard(github);
        fireEvent.click(screen.getByRole('button', { name: 'Connect a GitHub account' }));
        await waitFor(() => expect(setError).toHaveBeenCalledWith('Unauthorized'));
    });

    it('lists the connected accounts and offers to connect another', () => {
        renderCard(twoAccounts);

        expect(screen.getByText('octocat')).toBeInTheDocument();
        expect(screen.getByText('Account no longer accessible')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Connect another GitHub account' }),
        ).toBeInTheDocument();
        expect(screen.queryByText(/Key ending in/)).toBeNull();
        expect(screen.queryByRole('button', { name: 'Disconnect' })).toBeNull();
    });

    it('removes one account after confirmation', async () => {
        vi.stubGlobal(
            'confirm',
            vi.fn(() => true),
        );
        const fetchMock = mockApi({ 'DELETE /services/github/accounts/12': { status: 204 } });
        renderCard(twoAccounts);

        fireEvent.click(screen.getByRole('button', { name: 'Disconnect octocat' }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
        expect(String(fetchMock.mock.calls[0][0])).toContain('/services/github/accounts/12');
    });
});
