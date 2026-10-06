import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

let shouldThrow = true;
function Flaky() {
    if (shouldThrow) throw new Error('Widget exploded');
    return <p>Widget content</p>;
}

afterEach(() => {
    shouldThrow = true;
    vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
    it('contains a crashing child and keeps its siblings rendered', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <>
                <ErrorBoundary>
                    <Flaky />
                </ErrorBoundary>
                <p>Other widget</p>
            </>,
        );
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('The request failed. Please try again.')).toBeInTheDocument();
        expect(screen.getByText('Other widget')).toBeInTheDocument();
    });

    it('renders the child again after Try again', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <ErrorBoundary>
                <Flaky />
            </ErrorBoundary>,
        );
        shouldThrow = false;
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(screen.getByText('Widget content')).toBeInTheDocument();
    });

    it('uses a custom fallback when given', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <ErrorBoundary fallback={<p>Custom fallback</p>}>
                <Flaky />
            </ErrorBoundary>,
        );
        expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    });
});
