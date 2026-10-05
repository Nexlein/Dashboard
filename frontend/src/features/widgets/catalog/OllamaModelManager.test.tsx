import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { mockApi } from '@/test/fixtures';
import { OllamaModelManager } from './OllamaModelManager';

function renderManager(selectedModel = '') {
    const onSelectModel = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <OllamaModelManager selectedModel={selectedModel} onSelectModel={onSelectModel} />
        </QueryClientProvider>,
    );
    return { onSelectModel };
}

const rowOf = (text: string) => screen.getByText(text).closest('div') as HTMLElement;

afterEach(() => vi.unstubAllGlobals());

describe('OllamaModelManager', () => {
    it('offers Select for installed models and Install for the others', async () => {
        mockApi({
            'GET /chatbot/models': {
                body: { models: [{ name: 'llama3.2:1b' }, { name: 'phi3' }] },
            },
        });
        const { onSelectModel } = renderManager();

        await screen.findByText('phi3');
        expect(within(rowOf('Llama 3.2 (1B) - Very Fast')).getByRole('button')).toHaveTextContent(
            'Select',
        );
        expect(within(rowOf('Llama 3 (8B) - Powerful')).getByRole('button')).toHaveTextContent(
            'Install',
        );

        fireEvent.click(within(rowOf('phi3')).getByRole('button', { name: 'Select' }));
        expect(onSelectModel).toHaveBeenCalledWith('phi3');
    });

    it('marks the selected model', async () => {
        mockApi({ 'GET /chatbot/models': { body: { models: [{ name: 'llama3.2:1b' }] } } });
        renderManager('llama3.2:1b');
        expect(await screen.findByRole('button', { name: /Selected/ })).toBeInTheDocument();
    });

    it('installs a recommended model, selects it and reloads the list', async () => {
        let installed: { name: string }[] = [];
        const fetchMock = mockApi({
            'GET /chatbot/models': () => ({ models: installed }),
            'POST /chatbot/pull': (init) => {
                installed = [{ name: JSON.parse(String(init.body)).model }];
                return { success: true };
            },
        });
        const { onSelectModel } = renderManager();

        const row = rowOf('Qwen 2 (1.5B) - Smart & Light');
        fireEvent.click(await within(row).findByRole('button', { name: /Install/ }));

        await waitFor(() => expect(onSelectModel).toHaveBeenCalledWith('qwen2:1.5b'));
        expect(await within(row).findByRole('button', { name: 'Select' })).toBeInTheDocument();
        const pull = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
        expect(JSON.parse(String(pull?.[1]?.body))).toEqual({ model: 'qwen2:1.5b' });
    });

    it('pulls a custom model tag', async () => {
        const fetchMock = mockApi({
            'GET /chatbot/models': { body: { models: [] } },
            'POST /chatbot/pull': { body: { success: true } },
        });
        const { onSelectModel } = renderManager();

        fireEvent.change(screen.getByLabelText('Custom model tag'), {
            target: { value: '  mistral  ' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Pull' }));

        await waitFor(() => expect(onSelectModel).toHaveBeenCalledWith('mistral'));
        const pull = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
        expect(JSON.parse(String(pull?.[1]?.body))).toEqual({ model: 'mistral' });
    });

    it('shows the API error when Ollama is unreachable', async () => {
        mockApi({
            'GET /chatbot/models': { status: 502, body: { error: 'Failed to fetch models' } },
        });
        renderManager();
        expect(await screen.findByText('Failed to fetch models')).toBeInTheDocument();
    });

    it('shows the error when a pull fails', async () => {
        mockApi({
            'GET /chatbot/models': { body: { models: [] } },
            'POST /chatbot/pull': { status: 500, body: { error: 'model not found' } },
        });
        renderManager();
        fireEvent.click(
            await within(rowOf('Llama 3 (8B) - Powerful')).findByRole('button', {
                name: /Install/,
            }),
        );
        expect(await screen.findByText('model not found')).toBeInTheDocument();
    });
});
