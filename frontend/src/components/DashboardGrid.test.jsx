import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import DashboardGrid from './DashboardGrid';
import { useStore } from '@/store/useStore';
import { vi } from 'vitest';

vi.mock('./WidgetRenderer', () => ({
    default: ({ widget }) => (
        <div data-testid={`widget-${widget.i}`}>Mocked {widget.title} Content</div>
    ),
}));

describe('DashboardGrid Component', () => {
    beforeEach(() => {
        // Reset store with dummy widgets
        useStore.setState({
            widgets: [
                { i: 'a', x: 0, y: 0, w: 4, h: 2, title: 'Weather Widget' },
                { i: 'b', x: 4, y: 0, w: 4, h: 2, title: 'GitHub Repo' },
            ],
        });
    });

    it('renders all widgets from the store', () => {
        render(<DashboardGrid />);

        expect(screen.getByText('Weather Widget')).toBeInTheDocument();
        expect(screen.getByText('GitHub Repo')).toBeInTheDocument();
    });
});
