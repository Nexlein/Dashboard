import type { ApiErrorCode } from 'shared';

/** An error carrying the HTTP status and explicit code returned by the API. */
export class HttpError extends Error {
    statusCode: number;
    code: ApiErrorCode;

    constructor(message: string, statusCode: number, code: ApiErrorCode) {
        super(message);
        this.name = new.target.name;
        this.statusCode = statusCode;
        this.code = code;
    }
}
