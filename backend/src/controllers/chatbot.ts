import { apiError } from '../utils/apiError.ts';
import asyncHandler from '../utils/asyncHandler.ts';

export const getModels = asyncHandler(async (_req, res) => {
    const response = await fetch('http://ollama:11434/api/tags');
    if (!response.ok) {
        return res
            .status(response.status)
            .json({ ...apiError('Failed to fetch models from Ollama', 'OLLAMA_MODELS_FAILED') });
    }
    const data = await response.json();
    res.json(data);
});

export const pullModel = asyncHandler(async (req, res) => {
    const model = req.body.model;
    if (!model)
        return res.status(400).json({ ...apiError('Model name is required', 'MODEL_REQUIRED') });

    const response = await fetch('http://ollama:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
    });

    if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: unknown };
        return res.status(response.status).json({
            ...apiError(
                typeof errorData.error === 'string' ? errorData.error : 'Failed to pull model',
                'MODEL_PULL_FAILED',
            ),
        });
    }

    res.json({ success: true, message: `Model ${model} pulled successfully` });
});
