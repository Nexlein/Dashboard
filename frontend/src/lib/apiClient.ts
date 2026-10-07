export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export class ApiError extends Error {
    status: number;
    retryAfter?: number;
    code?: string;
    constructor(message: string, status: number, retryAfter?: number, code?: string) {
        super(message);
        this.status = status;
        this.retryAfter = retryAfter;
        this.code = code;
    }
}

/**
 * Calls the API and returns the parsed JSON body as T; throws with the API's error message.
 * The session travels in an httpOnly cookie, so every request includes credentials.
 */
export async function fetchClient<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const headers = {
        ...(options.body && typeof options.body === 'string'
            ? { 'Content-Type': 'application/json' }
            : {}),
        ...options.headers,
    };

    let response: Response;
    try {
        response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            credentials: 'include',
            headers: headers as HeadersInit,
        });
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        throw new ApiError('Network error', 0, undefined, 'NETWORK_ERROR');
    }

    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = (body as { error?: unknown }).error;
        const seconds = Number(
            (body as { retryAfter?: unknown }).retryAfter ?? response.headers.get('Retry-After'),
        );
        throw new ApiError(
            typeof message === 'string' ? message : `Request failed with status ${response.status}`,
            response.status,
            Number.isFinite(seconds) && seconds > 0 ? seconds : undefined,
            typeof (body as { code?: unknown }).code === 'string'
                ? (body as { code: string }).code
                : undefined,
        );
    }

    return body as T;
}
