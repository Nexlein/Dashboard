module.exports = {
    name: 'chatbot',
    widgets: [
        {
            name: 'ai_chat',
            description: 'Interactive AI Chatbot with optional RAG capabilities',
            params: [
                { name: 'provider', type: 'string' },
                { name: 'api_key', type: 'string' },
                { name: 'model', type: 'string' },
            ],
        },
    ],
};
