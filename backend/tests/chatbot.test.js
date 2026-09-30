const chatbot = require('../services/chatbot');

global.fetch = jest.fn();

describe('Chatbot Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('execute returns ready', async () => {
        const result = await chatbot.execute();
        expect(result).toEqual({ status: 'ready' });
    });

    test('chat throws if model is missing', async () => {
        await expect(chatbot.chat({}, {}, [])).rejects.toThrow('Missing model parameter');
    });

    test('chat returns reply from ollama', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: { content: 'hello from AI' } }),
        });

        const result = await chatbot.chat({ model: 'llama2' }, null, [
            { role: 'user', content: 'hi' },
        ]);
        expect(result).toEqual({ reply: 'hello from AI' });
        expect(fetch).toHaveBeenCalledWith('http://ollama:11434/api/chat', expect.any(Object));
    });

    test('chat throws on fetch failure', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Internal Server Error',
            status: 500,
        });

        await expect(chatbot.chat({ model: 'llama2' }, null, [])).rejects.toThrow(
            'Ollama API Error: Internal Server Error',
        );
    });
});
