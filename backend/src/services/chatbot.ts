import { HttpError } from '../utils/httpError.ts';
import type { ChatMessage, ServiceDefinition, WidgetParams } from './types.ts';

export default {
    name: 'chatbot',
    widgets: [
        {
            name: 'ai_chat',
            description: 'Interactive AI Chatbot',
            params: [{ name: 'model', type: 'string' }],
        },
    ],
    execute: async () => ({ status: 'ready' }),
    chat: async (params: WidgetParams, _context: unknown, messages: ChatMessage[]) => {
        const { model } = params;
        if (typeof model !== 'string' || !model) {
            throw new HttpError('Missing model parameter', 400);
        }

        const url = 'http://ollama:11434/api/chat';
        console.log(`[Chatbot] Fetching Ollama at: ${url}`);
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: false,
            }),
        });

        if (!res.ok) {
            throw new HttpError(`Ollama API Error: ${res.statusText}`, res.status);
        }

        const data = (await res.json()) as { message: { content: string } };
        return { reply: data.message.content };
    },
} satisfies ServiceDefinition;
