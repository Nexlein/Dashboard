const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
    '/models',
    asyncHandler(async (req, res) => {
        try {
            const response = await fetch('http://ollama:11434/api/tags');
            if (!response.ok) {
                return res
                    .status(response.status)
                    .json({ error: 'Failed to fetch models from Ollama' });
            }
            const data = await response.json();
            return res.json(data);
        } catch {
            const err = new Error('Could not connect to Ollama');
            err.statusCode = 500;
            throw err;
        }
    }),
);

router.post(
    '/pull',
    asyncHandler(async (req, res) => {
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
        } catch {
            const err = new Error('Could not connect to Ollama');
            err.statusCode = 500;
            throw err;
        }
    }),
);

module.exports = router;
