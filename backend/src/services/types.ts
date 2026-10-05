// Contract shared by every integration in services/: the registry exposes them through
// /about.json, /services and the widget routes.

export type WidgetParamSpec = { name: string; type: 'string' | 'integer' };

export type WidgetSpec = { name: string; description: string; params: WidgetParamSpec[] };

/** Decrypted widget parameters, as configured by the user. */
export type WidgetParams = Record<string, unknown>;

/** Decrypted credentials of the user's connection to the service. */
export type ServiceCredentials = Record<string, unknown>;

export type ServiceContext = {
    userId: number;
    refreshRate?: number;
    credentials?: ServiceCredentials | null;
    /** Scopes cache entries to one user connection. */
    cacheScope?: string;
};

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type ServiceDefinition = {
    name: string;
    displayName?: string;
    description?: string;
    /** False for services that work without a user connection. */
    configurable?: boolean;
    connection?: { type: 'apiKey' | 'oauth'; label: string; documentationUrl?: string };
    widgets: WidgetSpec[];
    execute?(widgetName: string, params: WidgetParams, context: ServiceContext): Promise<unknown>;
    /** Throws when the credentials are rejected by the provider. */
    verifyCredentials?(credentials: ServiceCredentials): Promise<unknown>;
    chat?(
        params: WidgetParams,
        context: ServiceContext,
        messages: ChatMessage[],
    ): Promise<{ reply: string }>;
};
