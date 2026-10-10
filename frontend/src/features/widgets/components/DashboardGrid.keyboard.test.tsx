import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { render } from '@/test-utils';
import { mockApi } from '@/test/fixtures';
import DashboardGrid from './DashboardGrid';
import type { DashboardWidget } from '@/features/widgets/lib/widgets';

const viewport = vi.hoisted(() => ({ width: 1400 }));

// Keep the real responsive grid; only its container measurement needs a browser substitute.
vi.mock('react-grid-layout', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-grid-layout')>()),
    useContainerWidth: () => ({ width: viewport.width, mounted: true, containerRef: null }),
}));

vi.mock('./WidgetRenderer', () => ({
    default: ({ widget }: { widget: DashboardWidget }) => (
        <input aria-label={`Draft ${widget.id}`} defaultValue="" />
    ),
}));

afterEach(() => vi.unstubAllGlobals());

describe('DashboardGrid keyboard layout with the real responsive grid', () => {
    it.each([1400, 1000])(
        'keeps drafts and focus while updating positions at %i px',
        async (width) => {
            viewport.width = width;
            mockApi({
                'GET /widgets': {
                    body: [0, 6].map((x, index) => ({
                        id: index + 1,
                        serviceName: 'chatbot',
                        widgetName: 'ai_chat',
                        params: { model: `model-${index}` },
                        refreshRate: 60,
                        layout: { x, y: 0, w: 6, h: 4 },
                    })),
                },
                'PUT /widgets/layout': { status: 204 },
            });
            render(<DashboardGrid />);
            const handle = await screen.findByRole('button', {
                name: 'Move or resize Ollama - model-0',
            });
            const ownDraft = screen.getByRole('textbox', { name: 'Draft 1' });
            const otherDraft = screen.getByRole('textbox', { name: 'Draft 2' });
            fireEvent.change(ownDraft, { target: { value: 'Unsent message' } });
            fireEvent.change(otherDraft, { target: { value: 'Another unsent message' } });
            const item = handle.closest('.react-grid-item') as HTMLElement;
            const initialWidth = item.style.width;
            handle.focus();
            fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
            await waitFor(() => expect(item.style.width).not.toBe(initialWidth));
            const beforeMove = item.style.transform;
            fireEvent.keyDown(handle, { key: 'ArrowRight' });
            await waitFor(() => expect(item.style.transform).not.toBe(beforeMove));

            expect(handle).toHaveFocus();
            expect(screen.getByRole('textbox', { name: 'Draft 1' })).toBe(ownDraft);
            expect(ownDraft).toHaveValue('Unsent message');
            expect(screen.getByRole('textbox', { name: 'Draft 2' })).toBe(otherDraft);
            expect(otherDraft).toHaveValue('Another unsent message');
        },
    );
});
