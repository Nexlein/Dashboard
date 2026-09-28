import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatbotWidget } from './ChatbotWidget';
import { API_URL } from '@/lib/auth';

const mockWidget = {
    id: 99,
    serviceName: 'chatbot',
    widgetName: 'ai_chat',
    params: { model: 'llama3' },
};

describe('ChatbotWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        global.fetch = vi.fn();
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    it('renders default message', () => {
        render(<ChatbotWidget widget={mockWidget} />);
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    });

    it('sends message and updates UI', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ reply: 'I am doing well, thanks!' }),
        });

        render(<ChatbotWidget widget={mockWidget} />);

        const input = screen.getByPlaceholderText('Type a message...');
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

        // Ensure fetch was called correctly
        expect(global.fetch).toHaveBeenCalledWith(
            `${API_URL}/widgets/99/chat`,
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('How are you?'),
            }),
        );
    });

    it('shows error message on failure', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'API Error' }),
        });

        render(<ChatbotWidget widget={mockWidget} />);

        fireEvent.change(screen.getByPlaceholderText('Type a message...'), {
            target: { value: 'Hi' },
        });
        fireEvent.click(screen.getByRole('button', { name: /send/i }));

        await waitFor(() => {
            expect(screen.getByText(/API Error/)).toBeInTheDocument();
        });
    });
});
