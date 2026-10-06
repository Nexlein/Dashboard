import { fetchClient } from '@/lib/apiClient';

/** GET /about.json, in the schema of the Epitech subject. */
export type AboutJson = {
    client: { host: string };
    server: {
        current_time: number;
        services: AboutService[];
    };
};

export type AboutService = { name: string; widgets: AboutWidget[] };

export type AboutWidget = {
    name: string;
    description: string;
    params: { name: string; type: 'string' | 'integer' }[];
};

export function fetchAbout(): Promise<AboutJson> {
    return fetchClient<AboutJson>('/about.json');
}
