module.exports = {
    name: 'chatbot',
    widgets: [
        {
            name: 'ai_chat',
            description: 'Interactive AI Chatbot',
            params: [{ name: 'model', type: 'string' }],
        },
    ],
    execute: async () => ({ status: 'ready' }),
    chat: async (params, context, messages) => {
        const { model } = params;
        if (!model) {
            const error = new Error('Missing model parameter');
            error.statusCode = 400;
            throw error;
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
            const error = new Error(`Ollama API Error: ${res.statusText}`);
            error.statusCode = res.status;
            throw error;
        }

        const data = await res.json();
        return { reply: data.message.content };
    },
};
