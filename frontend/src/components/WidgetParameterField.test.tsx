import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WidgetParameterField } from './WidgetParameterField';

const cryptoParam = {
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
