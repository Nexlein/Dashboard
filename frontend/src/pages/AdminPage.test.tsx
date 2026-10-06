import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@/test-utils';
import { makeUser, mockApi, type Route } from '@/test/fixtures';
import AdminPage from './AdminPage';

const me = makeUser({ id: 1, name: 'Ada', email: 'ada@example.com', role: 'admin' });

const apiUser = (overrides: Record<string, unknown>) => ({
    id: '2',
    email: 'bob@example.com',
    name: 'Bob',
    role: 'user',
    emailVerified: true,
    banned: false,
    createdAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
});

const USERS = [
    apiUser({ id: '1', email: 'ada@example.com', name: 'Ada', role: 'admin' }),
    apiUser({}),
    apiUser({
        id: '3',
        email: 'eve@example.com',
        name: 'Eve',
        banned: true,
        banExpires: '2026-10-13T10:00:00.000Z',
    }),
];

/** list-users answers USERS for the table and the matching count for each summary card. */
function listUsers(url: URL) {
    const field = url.searchParams.get('filterField');
    const users = USERS.filter((user) =>
        field === 'role'
            ? user.role === 'admin'
            : field === 'banned'
              ? user.banned
              : user.email.includes(url.searchParams.get('searchValue') ?? ''),
    );
    return { users, total: users.length };
}

/** The API, with list-users answered by `listUsers` from the request URL. */
function mockAdminApi(routes: Record<string, Route> = {}) {
    const fetchMock = mockApi(routes);
    const fallback = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname === '/api/auth/admin/list-users')
            return new Response(JSON.stringify(listUsers(url)));
        return fallback(input, init);
    });
    return fetchMock;
}

const row = (email: string) => screen.getByText(email).closest('tr')!;
const pageLabel = () => screen.getByText(/^Page \d+ \/ \d+$/).textContent;

afterEach(() => vi.unstubAllGlobals());

describe('AdminPage', () => {
    it('lists the accounts with their status and counts', async () => {
        mockAdminApi();
        render(<AdminPage currentUser={me} />);

        expect(await screen.findByText('bob@example.com')).toBeInTheDocument();
        expect(within(row('ada@example.com')).getAllByText('Vous')[0]).toBeInTheDocument();
        expect(within(row('eve@example.com')).getAllByText(/Banni jusqu/)[0]).toBeInTheDocument();
        const cards = screen.getByRole('button', { name: /Bannis/ });
        await waitFor(() => expect(cards).toHaveTextContent('1'));
        // Your own account cannot be acted on from here.
        expect(screen.getByRole('button', { name: 'Actions pour Ada' })).toBeDisabled();
    });

    it('shows only the banned accounts from their card', async () => {
        mockAdminApi();
        render(<AdminPage currentUser={me} />);
        await screen.findByText('bob@example.com');

        fireEvent.click(screen.getByRole('button', { name: /Bannis/ }));

        await waitFor(() => expect(screen.queryByText('bob@example.com')).toBeNull());
        expect(screen.getByText('eve@example.com')).toBeInTheDocument();
    });

    it('promotes a user after confirmation', async () => {
        const fetchMock = mockAdminApi({ 'POST /api/auth/admin/set-role': { body: {} } });
        vi.stubGlobal(
            'confirm',
            vi.fn(() => true),
        );
        render(<AdminPage currentUser={me} />);
        await screen.findByText('bob@example.com');

        fireEvent.click(screen.getByRole('button', { name: 'Actions pour Bob' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Nommer administrateur' }));

        await waitFor(() => {
            const call = fetchMock.mock.calls.find(([input]) =>
                String(input).endsWith('/admin/set-role'),
            );
            expect(JSON.parse(String(call?.[1]?.body))).toEqual({ userId: '2', role: 'admin' });
        });
    });

    it('does nothing when a deletion is not confirmed', async () => {
        const fetchMock = mockAdminApi();
        vi.stubGlobal(
            'confirm',
            vi.fn(() => false),
        );
        render(<AdminPage currentUser={me} />);
        await screen.findByText('bob@example.com');

        fireEvent.click(screen.getByRole('button', { name: 'Actions pour Bob' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Supprimer le compte' }));

        expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/remove-user'))).toBe(
            false,
        );
    });

    it('bans a user for the chosen length with a reason', async () => {
        const fetchMock = mockAdminApi({ 'POST /api/auth/admin/ban-user': { body: {} } });
        render(<AdminPage currentUser={me} />);
        await screen.findByText('bob@example.com');

        fireEvent.click(screen.getByRole('button', { name: 'Actions pour Bob' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Bannir…' }));
        const dialog = await screen.findByRole('dialog', { name: 'Bannir Bob' });
        fireEvent.change(within(dialog).getByLabelText(/Motif/), { target: { value: ' spam ' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Bannir' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        const call = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/ban-user'));
        expect(JSON.parse(String(call?.[1]?.body))).toEqual({
            userId: '2',
            banReason: 'spam',
            banExpiresIn: 7 * 24 * 60 * 60,
        });
    });

    it('shows the error of a refused action', async () => {
        mockAdminApi({
            'POST /api/auth/admin/unban-user': {
                status: 403,
                body: { message: 'You are not allowed to ban users', code: 'FORBIDDEN' },
            },
        });
        render(<AdminPage currentUser={me} />);
        await screen.findByText('eve@example.com');

        fireEvent.click(screen.getByRole('button', { name: 'Actions pour Eve' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Lever le bannissement' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'You are not allowed to ban users',
        );
    });

    it('shows an expired ban as lifted, with Ban offered again', async () => {
        mockApi({
            'GET /api/auth/admin/list-users': {
                body: {
                    users: [apiUser({ banned: true, banReason: 'spam', banExpires: '2020-01-01' })],
                    total: 1,
                },
            },
        });
        render(<AdminPage currentUser={me} />);
        await screen.findByText('bob@example.com');

        expect(within(row('bob@example.com')).queryByText(/^Banni/)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Actions pour Bob' }));
        expect(await screen.findByRole('menuitem', { name: 'Bannir…' })).toBeInTheDocument();
    });

    it('goes back to the last page when its only account is deleted', async () => {
        // 21 accounts: the second page holds one, which the test deletes.
        let total = 21;
        const fetchMock = mockApi({
            'POST /api/auth/admin/remove-user': () => {
                total = 20;
                return { success: true };
            },
        });
        const fallback = fetchMock.getMockImplementation()!;
        fetchMock.mockImplementation(async (input, init) => {
            const url = new URL(String(input));
            if (url.pathname !== '/api/auth/admin/list-users') return fallback(input, init);
            const offset = Number(url.searchParams.get('offset') ?? 0);
            const users = Array.from(
                { length: Math.max(0, Math.min(20, total - offset)) },
                (_, i) =>
                    apiUser({
                        id: String(100 + offset + i),
                        email: `user${offset + i}@example.com`,
                        name: `User ${offset + i}`,
                    }),
            );
            return new Response(JSON.stringify({ users, total }));
        });
        vi.stubGlobal(
            'confirm',
            vi.fn(() => true),
        );
        render(<AdminPage currentUser={me} />);
        await screen.findByText('user0@example.com');

        fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
        await screen.findByText('user20@example.com');
        expect(pageLabel()).toBe('Page 2 / 2');
        fireEvent.click(screen.getByRole('button', { name: 'Actions pour User 20' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Supprimer le compte' }));

        await waitFor(() => expect(pageLabel()).toBe('Page 1 / 1'));
        expect(await screen.findByText('user0@example.com')).toBeInTheDocument();
        expect(screen.queryByText('Aucun compte trouvé.')).toBeNull();
    });
});
