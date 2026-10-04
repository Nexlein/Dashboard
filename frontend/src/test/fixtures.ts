import type { User } from 'shared';
import {
    toDashboardWidget,
    type ApiWidget,
    type DashboardWidget,
} from '@/features/widgets/lib/widgets';

/** A dashboard widget built through the real API mapping, so tests use the app's shape. */
export function makeWidget(overrides: Partial<ApiWidget> = {}): DashboardWidget {
    return toDashboardWidget({
        id: 1,
        serviceName: 'weather',
        widgetName: 'current_weather',
        params: {},
        refreshRate: 60,
        layout: { x: 0, y: 0, w: 4, h: 2 },
        ...overrides,
    });
}

export function makeUser(overrides: Partial<User> = {}): User {
    return { id: 42, email: 'user@example.com', displayName: null, ...overrides };
}
