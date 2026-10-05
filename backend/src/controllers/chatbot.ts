import asyncHandler from '../utils/asyncHandler.ts';

export const getModels = asyncHandler(async (req, res) => {
    const response = await fetch('http://ollama:11434/api/tags');
    if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch models from Ollama' });
    }
    const data = await response.json();
    res.json(data);
});

export const pullModel = asyncHandler(async (req, res) => {
    const model = req.body.model;
    if (!model) return res.status(400).json({ error: 'Model name is required' });

    const response = await fetch('http://ollama:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res
            .status(response.status)
            .json({ error: errorData.error || 'Failed to pull model' });
    }

    res.json({ success: true, message: `Model ${model} pulled successfully` });
});
