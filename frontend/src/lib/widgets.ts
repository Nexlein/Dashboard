import { API_URL } from './auth';

export const MIN_REFRESH_RATE_SECONDS = 60;

export type ApiWidget = {
    id: number;
    serviceName: string;
    widgetName: string;
    params: Record<string, unknown>;
    refreshRate: number;
    layout: { x: number; y: number; w: number; h: number };
};

type WidgetPresentation = {
    title: string;
    defaultLayout?: ApiWidget['layout'];
    minW?: number;
    minH?: number;
};

const DEFAULT_WIDGET_LAYOUT: ApiWidget['layout'] = { x: 0, y: 0, w: 4, h: 2 };

const WIDGET_PRESENTATION: Record<string, WidgetPresentation> = {
    'weather:current_weather': {
        title: 'Weather',
        defaultLayout: { x: 0, y: 0, w: 3, h: 2 },
    },
    'weather:weather-current': {
        title: 'Weather',
        defaultLayout: { x: 0, y: 0, w: 3, h: 2 },
    },
    'weather:forecast': {
        title: 'Weather',
        defaultLayout: { x: 0, y: 0, w: 4, h: 3 },
    },
    'weather:weather-forecast': {
        title: 'Weather',
        defaultLayout: { x: 0, y: 0, w: 4, h: 3 },
    },
    'github:repo_stats': {
        title: 'GitHub - Repository Stats',
        defaultLayout: { x: 0, y: 0, w: 3, h: 3 },
        minW: 3,
        minH: 3,
    },
    'github:latest_commits': {
        title: 'GitHub - Latest Commits',
        defaultLayout: { x: 0, y: 0, w: 4, h: 3 },
        minW: 3,
        minH: 3,
    },
    'github:user_profile': {
        title: 'GitHub - User Profile',
        defaultLayout: { x: 0, y: 0, w: 3, h: 3 },
        minW: 3,
        minH: 3,
    },
    'crypto:crypto_price': {
        title: 'Crypto Price',
        defaultLayout: { x: 0, y: 0, w: 3, h: 2 },
    },
    'crypto:crypto_chart': {
        title: 'Crypto Market',
        defaultLayout: { x: 0, y: 0, w: 6, h: 5 },
        minW: 3,
        minH: 4,
    },
    'chatbot:ai_chat': {
        title: 'Ollama',
        defaultLayout: { x: 0, y: 0, w: 2, h: 3 },
        minW: 2,
        minH: 3,
    },
};

function widgetKey(serviceName: string, widgetName: string) {
    return `${serviceName}:${widgetName}`;
}

export function getDefaultWidgetLayout(serviceName: string, widgetName: string) {
    const configuredLayout = WIDGET_PRESENTATION[widgetKey(serviceName, widgetName)]?.defaultLayout;
    return { ...(configuredLayout || DEFAULT_WIDGET_LAYOUT) };
}

export function toDashboardWidget(widget: ApiWidget) {
    let title =
        WIDGET_PRESENTATION[widgetKey(widget.serviceName, widget.widgetName)]?.title ||
        widget.widgetName;

    if (widget.serviceName === 'chatbot' && widget.params?.model) {
        title = `Ollama - ${widget.params.model}`;
    }

    return {
        ...widget,
        refreshRate: Math.max(widget.refreshRate, MIN_REFRESH_RATE_SECONDS),
        i: String(widget.id),
        x: widget.layout.x,
        y: widget.layout.y,
        w: widget.layout.w,
        h: widget.layout.h,
        minW: WIDGET_PRESENTATION[widgetKey(widget.serviceName, widget.widgetName)]?.minW,
        minH: WIDGET_PRESENTATION[widgetKey(widget.serviceName, widget.widgetName)]?.minH,
        title,
    };
}

export async function fetchWidgets() {
    const token = localStorage.getItem('dashboard-auth-token');
    const response = await fetch(`${API_URL}/widgets`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch widgets');
    }

    return response.json();
}

export async function createWidget(widgetData): Promise<ApiWidget> {
    const token = localStorage.getItem('dashboard-auth-token');
    const response = await fetch(`${API_URL}/widgets`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(widgetData),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Failed to create widget');
    return body;
}

export async function fetchWidgetData(id: number) {
    const token = localStorage.getItem('dashboard-auth-token');
    const response = await fetch(`${API_URL}/widgets/${id}/data`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Failed to fetch widget data');
    return body;
}

export async function updateWidgetLayouts(layouts) {
    const token = localStorage.getItem('dashboard-auth-token');
    const response = await fetch(`${API_URL}/widgets/layout`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ layouts }),
    });

    if (!response.ok) {
        throw new Error('Failed to update widget layouts');
    }
}

export async function updateWidget(id: number, widgetData): Promise<ApiWidget> {
    const token = localStorage.getItem('dashboard-auth-token');
    const response = await fetch(`${API_URL}/widgets/${id}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(widgetData),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Failed to update widget');
    return body;
}

export async function deleteWidget(id) {
    const token = localStorage.getItem('dashboard-auth-token');
    const response = await fetch(`${API_URL}/widgets/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to delete widget');
    }
}
