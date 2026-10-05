import type { NextFunction, Request, Response } from 'express';

type HandledError = Error & { statusCode?: number; code?: string };

// Express recognises error handlers by their 4-argument signature, so keep `_next`.
function errorHandler(err: HandledError, _req: Request, res: Response, _next: NextFunction) {
    console.error('Unhandled error:', err);

    if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    if (err.name === 'PrismaClientKnownRequestError') {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Resource already exists (conflict)' });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Resource not found' });
        }
    }

    res.status(500).json({ error: 'Internal server error' });
}

export default errorHandler;
