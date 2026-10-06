import i18n from '@/i18n';
import { fetchClient } from '@/lib/apiClient';
import type { ServiceDefinition, WidgetDefinition } from './types';

export const MIN_REFRESH_RATE_SECONDS = 60;

/** Widgets without a refresh timer accept any value. */
export function isRefreshRateValid(
    refreshTimer: string,
    serviceDef?: ServiceDefinition,
    widgetDef?: WidgetDefinition,
) {
    if ((widgetDef?.hasRefresh ?? serviceDef?.hasRefresh) === false) return true;
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
        get title() {
            return i18n.t('widgets:weather');
        },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2 },
    },
    'weather:weather-current': {
        get title() {
            return i18n.t('widgets:weather');
        },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2 },
    },
    'weather:forecast': {
        get title() {
            return i18n.t('widgets:weather');
        },
        defaultLayout: { x: 0, y: 0, w: 4, h: 3 },
    },
    'weather:weather-forecast': {
        get title() {
            return i18n.t('widgets:weather');
        },
        defaultLayout: { x: 0, y: 0, w: 4, h: 3 },
    },
    'github:repo_stats': {
        get title() {
            return i18n.t('widgets:githubStatsTitle');
        },
        defaultLayout: { x: 0, y: 0, w: 3, h: 3 },
        minW: 3,
        minH: 3,
    },
    'github:latest_commits': {
        get title() {
            return i18n.t('widgets:githubCommitsTitle');
        },
        defaultLayout: { x: 0, y: 0, w: 4, h: 3 },
        minW: 3,
        minH: 3,
    },
    'github:user_profile': {
        get title() {
            return i18n.t('widgets:githubProfileTitle');
        },
        defaultLayout: { x: 0, y: 0, w: 3, h: 3 },
        minW: 3,
        minH: 3,
    },
    'youtube:video_player': {
        get title() {
            return i18n.t('widgets:youtubeVideoTitle');
        },
        defaultLayout: { x: 0, y: 0, w: 4, h: 4 },
        minW: 3,
        minH: 4,
    },
    'youtube:channel_watch': {
        get title() {
            return i18n.t('widgets:youtubeWatchTitle');
        },
        defaultLayout: { x: 0, y: 0, w: 5, h: 5 },
        minW: 3,
        minH: 4,
    },
    'crypto:crypto_price': {
        get title() {
            return i18n.t('widgets:cryptoPriceTitle');
        },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2 },
    },
    'stocks:stock_market': {
        get title() {
            return i18n.t('widgets:stockMarket');
        },
        defaultLayout: { x: 0, y: 0, w: 6, h: 5 },
        minW: 3,
        minH: 4,
    },
    'stocks:stock_profile': {
        get title() {
            return i18n.t('widgets:stockProfile');
        },
        defaultLayout: { x: 0, y: 0, w: 4, h: 4 },
        minW: 3,
        minH: 4,
    },
    'crypto:crypto_chart': {
        get title() {
            return i18n.t('widgets:cryptoMarketTitle');
        },
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
        title: getWidgetTitle(widget),
    };
}

/** Resolve titles at render time as cached widget data survives a language change. */
export function getWidgetTitle(widget: Pick<ApiWidget, 'serviceName' | 'widgetName' | 'params'>) {
    if (widget.serviceName === 'chatbot' && widget.params?.model) {
        return `Ollama - ${widget.params.model}`;
    }
    return (
        WIDGET_PRESENTATION[widgetKey(widget.serviceName, widget.widgetName)]?.title ||
        widget.widgetName
    );
}

export async function fetchUserWidgets(): Promise<DashboardWidget[]> {
    const widgets: ApiWidget[] = await fetchClient('/widgets');
    return widgets.map(toDashboardWidget);
}

/**
 * React Query key of a widget's data: one entry per params, so a widget keeps the data of
 * its other settings (e.g. another chart period). `widgetQueryKey(widget.id)` matches them all.
 */
export function widgetQueryKey(widgetId: number, params?: DashboardWidget['params']) {
    return params === undefined ? ['widget', widgetId] : ['widget', widgetId, params];
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
