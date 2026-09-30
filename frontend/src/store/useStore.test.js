import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from './useStore';
import * as widgetsApi from '@/lib/widgets';

vi.mock('@/lib/widgets', () => ({
    fetchWidgets: vi.fn(),
    deleteWidget: vi.fn(),
    updateWidget: vi.fn(),
    createWidget: vi.fn(),
    toDashboardWidget: vi.fn((w) => ({ ...w, i: String(w.id) })),
}));

describe('useStore', () => {
    beforeEach(() => {
        useStore.setState({ widgets: [], theme: 'light' });
        vi.clearAllMocks();
    });

    it('sets theme', () => {
        useStore.getState().setTheme('dark');
        expect(useStore.getState().theme).toBe('dark');
    });

    it('adds and removes widget synchronously', () => {
        useStore.getState().addWidget({ i: '1', title: 'Test' });
        expect(useStore.getState().widgets).toHaveLength(1);
        useStore.getState().removeWidget('1');
        expect(useStore.getState().widgets).toHaveLength(0);
    });

    it('updates widget synchronously', () => {
        useStore.getState().addWidget({ i: '1', title: 'Test' });
        useStore.getState().updateWidget('1', { title: 'Updated' });
        expect(useStore.getState().widgets[0].title).toBe('Updated');
    });

    it('fetches widgets async', async () => {
        widgetsApi.fetchWidgets.mockResolvedValue([{ id: 1, name: 'Weather' }]);
        await useStore.getState().fetchWidgetsAsync();
        expect(useStore.getState().widgets).toHaveLength(1);
        expect(useStore.getState().widgets[0].i).toBe('1');
    });

    it('creates widget async', async () => {
        widgetsApi.createWidget.mockResolvedValue({ id: 2, name: 'Github' });
        await useStore.getState().createWidgetAsync({ name: 'Github' });
        expect(useStore.getState().widgets).toHaveLength(1);
        expect(useStore.getState().widgets[0].i).toBe('2');
    });

    it('updates widget async', async () => {
        useStore.getState().addWidget({ i: '3', title: 'Old' });
        widgetsApi.updateWidget.mockResolvedValue({ id: 3, title: 'New' });
        await useStore.getState().updateWidgetAsync('3', { title: 'New' });
        expect(useStore.getState().widgets[0].title).toBe('New');
    });

    it('deletes widget async', async () => {
        useStore.getState().addWidget({ i: '4', title: 'Delete me' });
        widgetsApi.deleteWidget.mockResolvedValue();
        await useStore.getState().deleteWidgetAsync('4');
        expect(useStore.getState().widgets).toHaveLength(0);
        expect(widgetsApi.deleteWidget).toHaveBeenCalledWith(4);
    });
});
