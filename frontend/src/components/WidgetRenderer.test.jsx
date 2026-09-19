import { render, screen, act } from '@testing-library/react';
import WidgetRenderer from './WidgetRenderer';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('WidgetRenderer', () => {
    const mockWidget = {
        serviceName: 'test-service',
        widgetName: 'test-widget',
        params: { key: 'value' },
        refreshRate: 5,
    };

    it('renders loading state initially', async () => {
        render(<WidgetRenderer widget={mockWidget} />);

        // lucide-react Loader2 has class "animate-spin"
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('fetches data and renders content after timeout', async () => {
        render(<WidgetRenderer widget={mockWidget} />);

        // No need to advance timers manually, findByTestId will wait

        const content = await screen.findByTestId('widget-renderer-content');
        expect(content).toBeInTheDocument();
        expect(screen.getByText(/test-service \/ test-widget/)).toBeInTheDocument();
        expect(screen.getByText(/mockData/)).toBeInTheDocument();
    });
});
