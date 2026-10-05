import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as _originalRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatbotWidget } from './ChatbotWidget';
import { API_URL } from '@/lib/auth';
import { makeWidget } from '@/test/fixtures';

const mockWidget = makeWidget({
    id: 99,
    serviceName: 'chatbot',
    widgetName: 'ai_chat',
    params: { model: 'llama3' },
});
const fetchMock = vi.fn<typeof fetch>();

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const customRender = (ui: React.ReactElement) => {
    return _originalRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};
describe('ChatbotWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.stubGlobal('fetch', fetchMock);
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    it('renders default message', () => {
        customRender(<ChatbotWidget widget={mockWidget} />);
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
        expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    });

    it('sends message and updates UI', async () => {
        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify({ reply: 'I am doing well, thanks!' }), { status: 200 }),
        );

        customRender(<ChatbotWidget widget={mockWidget} />);

        const input = screen.getByPlaceholderText<HTMLInputElement>('Type a message...');
        const sendBtn = screen.getByRole('button', { name: /send/i });

        fireEvent.change(input, { target: { value: 'How are you?' } });
        fireEvent.click(sendBtn);

        // User message should appear immediately
        expect(screen.getByText('How are you?')).toBeInTheDocument();

        // Input should be cleared
        expect(input.value).toBe('');

        // Wait for bot response
        await waitFor(() => {
            expect(screen.getByText('I am doing well, thanks!')).toBeInTheDocument();
        });
        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();

        // Ensure fetch was called correctly
        expect(fetchMock).toHaveBeenCalledWith(
            `${API_URL}/widgets/99/chat`,
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('How are you?'),
            }),
        );
    });

    it('shows error message on failure', async () => {
        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify({ error: 'API Error' }), { status: 500 }),
        );

        customRender(<ChatbotWidget widget={mockWidget} />);

        fireEvent.change(screen.getByPlaceholderText('Type a message...'), {
            target: { value: 'Hi' },
        });
        fireEvent.click(screen.getByRole('button', { name: /send/i }));

        await waitFor(() => {
            expect(screen.getByText(/API Error/)).toBeInTheDocument();
        });
    });
});
