import type { ComponentType } from 'react';
import type { DashboardWidget } from './widgets';

export type ParamOption = { value: string; label: string };

/** One configurable widget parameter, rendered by WidgetParameterField. */
export type WidgetParamDefinition = {
    id: string;
    label: string;
    type: 'text' | 'select' | 'coin-multiselect' | 'hidden';
    placeholder?: string;
    options?: ParamOption[];
};

/** Props WidgetRenderer passes to every catalog widget. `data` is the /widgets/:id/data response. */
export type WidgetViewProps<TData> = {
    data: TData;
    widget: DashboardWidget;
    selectedPeriod?: unknown;
    onPeriodChange: (days: string) => void;
    periodUpdating: boolean;
};

/** Extra configuration UI shown in the widget form (e.g. the Ollama model picker). */
export type CustomConfigProps = {
    selectedModel: string;
    onSelectModel: (model: string) => void;
};

export type WidgetDefinition = {
    id: string;
    name: string;
    /** Older widget names still stored in the database. */
    aliases?: string[];
    // `never` accepts any catalog component whatever its data type; WidgetRenderer is the
    // single place that hands the untyped API response to it.
    component: ComponentType<WidgetViewProps<never>>;
    customConfigUi?: ComponentType<CustomConfigProps>;
    params: WidgetParamDefinition[];
};

export type ServiceDefinition = {
    name: string;
    /** false for widgets that fetch nothing on a timer (the chatbot). */
    hasRefresh: boolean;
    widgets: WidgetDefinition[];
};
