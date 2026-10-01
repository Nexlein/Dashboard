import { fetchClient } from './apiClient';

export const MIN_REFRESH_RATE_SECONDS = 60;

export function getDefaultWidgetLayout(
    _service?: string,
    _widgetType?: string,
): { x: number; y: number; w: number; h: number } {
    return { x: 0, y: 0, w: 4, h: 3 };
}

export type DashboardWidget = {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    service: string;
    type: string;
    params?: Record<string, string | number | boolean>;
};

export async function fetchUserWidgets(): Promise<DashboardWidget[]> {
    const rawWidgets = await fetchClient('/widgets');
    return rawWidgets.map((w: any) => ({
        i: String(w.id),
        x: w.layout.x,
        y: w.layout.y,
        w: w.layout.w,
        h: w.layout.h,
        service: w.serviceName,
        type: w.widgetName,
        params: w.params,
    }));
}

export async function fetchWidgetData(widgetId: string | number) {
    return fetchClient(`/widgets/${widgetId}/data`);
}

export async function addWidgetConfig(payload: any) {
    const w = await fetchClient('/widgets', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return {
        i: String(w.id),
        x: w.layout.x,
        y: w.layout.y,
        w: w.layout.w,
        h: w.layout.h,
        service: w.serviceName,
        type: w.widgetName,
        params: w.params,
    } as DashboardWidget;
}

export async function updateWidgetConfig(widgetId: string | number, updates: any) {
    return fetchClient(`/widgets/${widgetId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

export async function updateWidgetsLayout(layouts: { id: number; layout: any }[]) {
    return fetchClient('/widgets/layout', {
        method: 'PUT',
        body: JSON.stringify({ layouts }),
    });
}

export async function removeWidgetConfig(widgetId: string | number) {
    return fetchClient(`/widgets/${widgetId}`, {
        method: 'DELETE',
    });
}

export async function sendWidgetChatMessage(
    widgetId: string | number,
    messages: { role: string; content: string }[],
) {
    return fetchClient(`/widgets/${widgetId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ messages }),
    });
}
