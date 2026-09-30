import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WidgetForm } from './WidgetForm';
import { MIN_REFRESH_RATE_SECONDS } from '@/lib/widgets';

describe('WidgetForm', () => {
    const defaultProps = {
        serviceDef: { hasRefresh: true },
        widgetDef: {
            params: [{ id: 'city', label: 'City', type: 'string', required: true }],
        },
        params: { city: 'Paris' },
        setParams: vi.fn(),
        refreshTimer: 30,
        setRefreshTimer: vi.fn(),
    };

    it('renders standard parameters', () => {
        render(<WidgetForm {...defaultProps} />);
        expect(screen.getByLabelText('City')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Paris')).toBeInTheDocument();
    });

    it('updates standard parameters on change', () => {
        render(<WidgetForm {...defaultProps} />);
        const input = screen.getByLabelText('City');
        fireEvent.change(input, { target: { value: 'Lyon' } });
        expect(defaultProps.setParams).toHaveBeenCalledWith({ city: 'Lyon' });
    });

    it('renders refresh timer when service hasRefresh is true', () => {
        render(<WidgetForm {...defaultProps} />);
        expect(screen.getByLabelText('Refresh Rate (seconds)')).toBeInTheDocument();
        expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    });

    it('updates refresh timer on change', () => {
        render(<WidgetForm {...defaultProps} />);
        const input = screen.getByLabelText('Refresh Rate (seconds)');
        fireEvent.change(input, { target: { value: '60' } });
        expect(defaultProps.setRefreshTimer).toHaveBeenCalledWith('60');
    });

    it('does not render refresh timer when service hasRefresh is false', () => {
        render(<WidgetForm {...defaultProps} serviceDef={{ hasRefresh: false }} />);
        expect(screen.queryByLabelText('Refresh Rate (seconds)')).not.toBeInTheDocument();
    });

    it('renders custom config UI if provided', () => {
        const CustomUI = ({ selectedModel, onSelectModel }) => (
            <div>
                <span data-testid="custom-ui-model">{selectedModel}</span>
                <button onClick={() => onSelectModel('llama3')}>Select LLaMA</button>
            </div>
        );

        render(
            <WidgetForm
                {...defaultProps}
                widgetDef={{ ...defaultProps.widgetDef, customConfigUi: CustomUI }}
                params={{ ...defaultProps.params, model: 'gpt-4' }}
            />,
        );

        expect(screen.getByTestId('custom-ui-model')).toHaveTextContent('gpt-4');
        fireEvent.click(screen.getByText('Select LLaMA'));
        expect(defaultProps.setParams).toHaveBeenCalledWith({ city: 'Paris', model: 'llama3' });
    });

    it('returns null if serviceDef or widgetDef are missing', () => {
        const { container } = render(<WidgetForm {...defaultProps} serviceDef={null} />);
        expect(container).toBeEmptyDOMElement();

        const { container: container2 } = render(<WidgetForm {...defaultProps} widgetDef={null} />);
        expect(container2).toBeEmptyDOMElement();
    });
});
