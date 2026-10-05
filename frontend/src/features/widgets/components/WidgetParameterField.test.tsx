import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { render as renderWithProviders } from '@/test-utils';
import { makeService, mockApi } from '@/test/fixtures';
import { describe, expect, it, vi } from 'vitest';
import { WidgetParameterField } from './WidgetParameterField';
import type { WidgetParamDefinition } from '@/features/widgets/lib/types';

const cryptoParam: WidgetParamDefinition = {
    id: 'coins',
    label: 'Cryptocurrencies',
    type: 'coin-multiselect',
    placeholder: 'CoinGecko ID',
    options: [{ value: 'bitcoin', label: 'BTC' }],
};

describe('WidgetParameterField', () => {
    it('accepts any valid CoinGecko ID, not only the suggestions', () => {
        const onChange = vi.fn();
        render(<WidgetParameterField param={cryptoParam} value="bitcoin" onChange={onChange} />);

        fireEvent.change(screen.getByLabelText('CoinGecko coin ID'), {
            target: { value: 'render-token' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add cryptocurrency' }));

        expect(onChange).toHaveBeenCalledWith('bitcoin,render-token');
    });

    it('removes a selected cryptocurrency', () => {
        const onChange = vi.fn();
        render(
            <WidgetParameterField
                param={cryptoParam}
                value="bitcoin,ethereum"
                onChange={onChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Remove ethereum' }));

        expect(onChange).toHaveBeenCalledWith('bitcoin');
    });
});

describe('WidgetParameterField for a connected account', () => {
    const accountParam: WidgetParamDefinition = {
        id: 'account',
        label: 'GitHub account',
        type: 'account',
        service: 'github',
    };
    const githubWith = (accounts: { id: number; login: string | null }[]) =>
        makeService({
            name: 'github',
            displayName: 'GitHub',
            connectionType: 'oauth',
            connected: accounts.length > 0,
            provider: 'github-service',
            accounts: accounts.map((account) => ({ ...account, avatarUrl: null })),
        });

    it('points to Services when no account is connected', async () => {
        mockApi({ 'GET /services': { body: [githubWith([])] } });
        renderWithProviders(
            <WidgetParameterField param={accountParam} value="" onChange={vi.fn()} />,
        );

        expect(await screen.findByRole('status')).toHaveTextContent(
            'Connect a GitHub account in Services first.',
        );
        expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/services');
    });

    it('picks the only connected account', async () => {
        mockApi({ 'GET /services': { body: [githubWith([{ id: 12, login: 'octocat' }])] } });
        const onChange = vi.fn();
        renderWithProviders(
            <WidgetParameterField param={accountParam} value="" onChange={onChange} />,
        );

        await waitFor(() => expect(onChange).toHaveBeenCalledWith('12'));
    });

    it('lets the user choose among several accounts', async () => {
        mockApi({
            'GET /services': {
                body: [
                    githubWith([
                        { id: 12, login: 'octocat' },
                        { id: 13, login: 'hubot' },
                    ]),
                ],
            },
        });
        const onChange = vi.fn();
        renderWithProviders(
            <WidgetParameterField param={accountParam} value="13" onChange={onChange} />,
        );

        expect(await screen.findByLabelText('GitHub account')).toBeInTheDocument();
        // Several accounts: the widget must name one, nothing is chosen for the user.
        expect(onChange).not.toHaveBeenCalled();
    });
});
