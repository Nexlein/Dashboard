import { apiError, errorCode } from '../utils/apiError.ts';
import type { NextFunction, Request, Response } from 'express';

type HandledError = Error & { statusCode?: number; code?: string };

// Express recognises error handlers by their 4-argument signature, so keep `_next`.
function errorHandler(err: HandledError, _req: Request, res: Response, _next: NextFunction) {
    console.error('Unhandled error:', err);

    if (err.statusCode) {
        return res
            .status(err.statusCode)
            .json({ ...apiError(err.message, errorCode(err, 'REQUEST_FAILED')) });
    }

    if (err.name === 'PrismaClientKnownRequestError') {
        if (err.code === 'P2002') {
            return res
                .status(409)
                .json({ ...apiError('Resource already exists (conflict)', 'RESOURCE_EXISTS') });
        }
        if (err.code === 'P2025') {
            return res
                .status(404)
                .json({ ...apiError('Resource not found', 'RESOURCE_NOT_FOUND') });
        }
    }

    res.status(500).json({ ...apiError('Internal server error', 'INTERNAL_SERVER_ERROR') });
}

export default errorHandler;
