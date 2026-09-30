import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import { ProfileSettingsModal } from './ProfileSettingsModal';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
});

function openAccount(onLogout = vi.fn()) {
    localStorage.setItem('dashboard-auth-token', 'test-token');
    render(
        <MemoryRouter>
            <Navbar user={{ id: 42, email: 'user@example.com' }} onLogout={onLogout} />
        </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu du compte/i }));
    return onLogout;
}

it.each([401, 500])(
    'preserves the session and reports a deletion failure for HTTP %s',
    async (status) => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status }));
        const onLogout = openAccount();
        fireEvent.click(screen.getByRole('menuitem', { name: /delete my account/i }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'La suppression n’a pas pu être confirmée',
        );
        expect(onLogout).not.toHaveBeenCalled();
        expect(localStorage.getItem('dashboard-auth-token')).toBe('test-token');
    },
);

it('reports a network failure without logging out', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const onLogout = openAccount();
    fireEvent.click(screen.getByRole('menuitem', { name: /delete my account/i }));
    await screen.findByRole('alert');
    expect(onLogout).not.toHaveBeenCalled();
});

it('logs out only after a successful deletion', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const onLogout = openAccount();
    fireEvent.click(screen.getByRole('menuitem', { name: /delete my account/i }));
    await waitFor(() => expect(onLogout).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/auth/delete-account'), {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' },
    });
    expect(screen.queryByRole('alert')).toBeNull();
});

it('does not delete when the user cancels', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const onLogout = openAccount();
    fireEvent.click(screen.getByRole('menuitem', { name: /delete my account/i }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
});

it('reports a failed export instead of silently doing nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    openAccount();
    fireEvent.click(screen.getByRole('menuitem', { name: /download my data/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Le téléchargement a échoué');
});

it('downloads a successful export as JSON', async () => {
    const data = { widgets: [{ params: { city: 'Paris' } }] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
    const createObjectURL = vi.fn().mockReturnValue('blob:export');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    openAccount();
    fireEvent.click(screen.getByRole('menuitem', { name: /download my data/i }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(createObjectURL.mock.calls[0][0].type).toBe('application/json');
    expect(click.mock.instances[0].download).toBe('my-dashboard-data.json');
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:export'));
});

it('allows both display name and email changes for an OAuth profile', async () => {
    const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ displayName: 'New name' }) });
    vi.stubGlobal('fetch', fetchMock);
    const onUserUpdated = vi.fn();
    render(
        <ProfileSettingsModal
            open
            onOpenChange={vi.fn()}
            user={{ email: 'github@example.com' }}
            onUserUpdated={onUserUpdated}
        />,
    );
    expect(screen.getByLabelText('Email Address')).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Email Address'), {
        target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'New name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(onUserUpdated).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        displayName: 'New name',
        email: 'new@example.com',
    });
});
