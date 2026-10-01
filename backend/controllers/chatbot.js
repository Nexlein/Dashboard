const asyncHandler = require('../utils/asyncHandler');

exports.getModels = asyncHandler(async (req, res) => {
    try {
        const response = await fetch('http://ollama:11434/api/tags');
        if (!response.ok) {
            return res
                .status(response.status)
                .json({ error: 'Failed to fetch models from Ollama' });
        }
        const data = await response.json();
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Could not connect to Ollama' });
    }
});

exports.pullModel = asyncHandler(async (req, res) => {
    try {
        const model = req.body.model;
        if (!model) return res.status(400).json({ error: 'Model name is required' });

        const response = await fetch('http://ollama:11434/api/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: model, stream: false }),
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to pull model' });
        }

        return res.json({ status: 'success' });
    } catch (error) {
        return res.status(500).json({ error: 'Could not connect to Ollama' });
    }
});
