/** An error carrying the HTTP status the API should answer with (see middleware/errorHandler). */
export class HttpError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = new.target.name;
        this.statusCode = statusCode;
    }
}
