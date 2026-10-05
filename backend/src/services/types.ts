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

/** A connected OAuth account, as Services shows it. */
export type ConnectedAccountInfo = { login: string; avatarUrl?: string };

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type ServiceDefinition = {
    name: string;
    displayName?: string;
    description?: string;
    connection?: {
        type: 'apiKey' | 'oauth';
        label: string;
        documentationUrl?: string;
        /** OAuth: the Better Auth provider of the accounts the user connects (several allowed). */
        provider?: string;
    };
    widgets: WidgetSpec[];
    /** Local validation without consuming provider credits. */
    validateParams?(widgetName: string, params: WidgetParams): void;
    execute?(widgetName: string, params: WidgetParams, context: ServiceContext): Promise<unknown>;
    /** OAuth: who a connected account is, shown in Services (e.g. the GitHub login). */
    describeAccount?(credentials: ServiceCredentials): Promise<ConnectedAccountInfo>;
    /** Throws when the credentials are rejected by the provider. */
    verifyCredentials?(credentials: ServiceCredentials): Promise<unknown>;
    /** Searches the provider (e.g. stock symbols) with the user's connection. */
    search?(query: string, context: ServiceContext): Promise<unknown>;
    chat?(
        params: WidgetParams,
        context: ServiceContext,
        messages: ChatMessage[],
    ): Promise<{ reply: string }>;
};
