import { fetchClient } from '@/lib/apiClient';
import type { ServiceDefinition } from './types';

export const MIN_REFRESH_RATE_SECONDS = 60;

/** Services without a refresh timer (the chatbot) accept any value. */
export function isRefreshRateValid(refreshTimer: string, serviceDef?: ServiceDefinition) {
    if (serviceDef?.hasRefresh === false) return true;
    const refreshRate = Number(refreshTimer);
    return Number.isInteger(refreshRate) && refreshRate >= MIN_REFRESH_RATE_SECONDS;
}

export type WidgetParams = Record<string, unknown>;

export type WidgetLayout = { x: number; y: number; w: number; h: number };

export type ApiWidget = {
    id: number;
    serviceName: string;
    widgetName: string;
    params: WidgetParams;
    refreshRate: number;
    layout: WidgetLayout;
};

export type DashboardWidget = ApiWidget &
    WidgetLayout & {
        i: string;
        minW?: number;
        minH?: number;
        title: string;
    };

export type CreateWidgetPayload = Omit<ApiWidget, 'id'>;
export type UpdateWidgetPayload = Partial<Pick<ApiWidget, 'params' | 'refreshRate' | 'layout'>>;

type WidgetPresentation = {
    title: string;
    defaultLayout?: WidgetLayout;
    minW?: number;
    minH?: number;
};

const DEFAULT_WIDGET_LAYOUT: WidgetLayout = { x: 0, y: 0, w: 4, h: 2 };

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
    'youtube:channel_stats': {
        title: 'YouTube Subscribers',
        defaultLayout: { x: 0, y: 0, w: 3, h: 2 },
    },
    'youtube:latest_videos': {
        title: 'YouTube Latest Videos',
        defaultLayout: { x: 0, y: 0, w: 4, h: 4 },
        minW: 3,
        minH: 3,
    },
    'youtube:video_stats': {
        title: 'YouTube Video Statistics',
        defaultLayout: { x: 0, y: 0, w: 3, h: 3 },
        minW: 3,
        minH: 3,
    },
    'crypto:crypto_price': {
        title: 'Crypto Price',
        defaultLayout: { x: 0, y: 0, w: 3, h: 2 },
    },
    'stocks:stock_market': {
        title: 'Stock Market',
        defaultLayout: { x: 0, y: 0, w: 6, h: 5 },
        minW: 3,
        minH: 4,
    },
    'stocks:stock_profile': {
        title: 'Stock Profile',
        defaultLayout: { x: 0, y: 0, w: 4, h: 4 },
        minW: 3,
        minH: 4,
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

export function getDefaultWidgetLayout(serviceName: string, widgetName: string): WidgetLayout {
    const configuredLayout = WIDGET_PRESENTATION[widgetKey(serviceName, widgetName)]?.defaultLayout;
    return { ...(configuredLayout || DEFAULT_WIDGET_LAYOUT) };
}

export function toDashboardWidget(widget: ApiWidget): DashboardWidget {
    const presentation = WIDGET_PRESENTATION[widgetKey(widget.serviceName, widget.widgetName)];
    let title = presentation?.title || widget.widgetName;

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
        minW: presentation?.minW,
        minH: presentation?.minH,
        title,
    };
}

export async function fetchUserWidgets(): Promise<DashboardWidget[]> {
    const widgets: ApiWidget[] = await fetchClient('/widgets');
    return widgets.map(toDashboardWidget);
}

export async function fetchWidgetData(widgetId: number) {
    return fetchClient(`/widgets/${widgetId}/data`);
}

export async function addWidgetConfig(payload: CreateWidgetPayload): Promise<DashboardWidget> {
    const widget: ApiWidget = await fetchClient('/widgets', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return toDashboardWidget(widget);
}

export async function updateWidgetConfig(
    widgetId: number,
    updates: UpdateWidgetPayload,
): Promise<ApiWidget> {
    return fetchClient(`/widgets/${widgetId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

export async function updateWidgetsLayout(
    layouts: { id: number; layout: WidgetLayout }[],
): Promise<void> {
    await fetchClient('/widgets/layout', {
        method: 'PUT',
        body: JSON.stringify({ layouts }),
    });
}

export async function removeWidgetConfig(widgetId: number): Promise<void> {
    await fetchClient(`/widgets/${widgetId}`, {
        method: 'DELETE',
    });
}

/** Same roles as the backend chat schema. */
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function sendWidgetChatMessage(
    widgetId: number,
    messages: ChatMessage[],
): Promise<{ reply: string }> {
    return fetchClient(`/widgets/${widgetId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ messages }),
    });
}
