const express = require('express');

const router = express.Router();

// GET /chatbot/models -> Fetch installed models from Ollama
router.get('/models', async (req, res) => {
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

// POST /chatbot/pull -> Pull a model in Ollama
router.post('/pull', async (req, res) => {
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

module.exports = router;
