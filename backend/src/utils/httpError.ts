import { apiErrorCode } from 'shared';

/** An error carrying the HTTP status the API should answer with (see middleware/errorHandler). */
export class HttpError extends Error {
    statusCode: number;
    code: string;

    constructor(message: string, statusCode: number, code = apiErrorCode(message)) {
        super(message);
        this.name = new.target.name;
        this.statusCode = statusCode;
        this.code = code;
    }
}
