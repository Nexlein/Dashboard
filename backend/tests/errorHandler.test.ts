import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import errorHandler from '../src/middleware/errorHandler.ts';

function respond(err: Error & { statusCode?: number; code?: string }) {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    errorHandler(err, {} as Request, res as unknown as Response, vi.fn() as NextFunction);
    return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

function prismaError(code: string) {
    return Object.assign(new Error('prisma'), { name: 'PrismaClientKnownRequestError', code });
}

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('errorHandler', () => {
    it('uses the status code an error carries', () => {
        expect(respond(Object.assign(new Error('Nope'), { statusCode: 418 }))).toEqual({
            status: 418,
            body: { error: 'Nope', code: 'REQUEST_FAILED' },
        });
    });

    it.each([
        ['P2002', 409, 'Resource already exists (conflict)', 'RESOURCE_EXISTS'],
        ['P2025', 404, 'Resource not found', 'RESOURCE_NOT_FOUND'],
        ['P2003', 500, 'Internal server error', 'INTERNAL_SERVER_ERROR'],
    ])('maps the Prisma error %s to %i', (code, status, error, errorCode) => {
        expect(respond(prismaError(code))).toEqual({ status, body: { error, code: errorCode } });
    });

    it('hides the message of unexpected errors', () => {
        expect(respond(new Error('connection string with password'))).toEqual({
            status: 500,
            body: { error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
        });
    });
});
