import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { WidgetParameterField } from './WidgetParameterField';
import { MIN_REFRESH_RATE_SECONDS, type WidgetParams } from '@/features/widgets/lib/widgets';
import type { ServiceDefinition, WidgetDefinition } from '@/features/widgets/lib/types';

export function WidgetForm({
    serviceDef,
    widgetDef,
    params,
    setParams,
    refreshTimer,
    setRefreshTimer,
}: {
    serviceDef: ServiceDefinition;
    widgetDef: WidgetDefinition;
    params: WidgetParams;
    setParams: (params: WidgetParams) => void;
    refreshTimer: string;
    setRefreshTimer: (value: string) => void;
}) {
    const CustomConfigUi = widgetDef.customConfigUi;
    const hasRefresh = widgetDef.hasRefresh ?? serviceDef.hasRefresh;

    return (
        <div className="grid gap-4 py-2">
            {/* Standard Parameters */}
            {widgetDef.params?.map((param) => (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-2" key={param.id}>
                    <WidgetParameterField
                        param={param}
                        value={String(params[param.id] ?? '')}
                        onChange={(value) => setParams({ ...params, [param.id]: value })}
                    />
                </div>
            ))}

            {/* Custom UI for specific widgets (e.g. Chatbot Model Manager) */}
            {CustomConfigUi && (
                <div className="animate-in fade-in slide-in-from-top-2">
                    <CustomConfigUi
                        selectedModel={String(params.model ?? '')}
                        onSelectModel={(model) => setParams({ ...params, model })}
                    />
                </div>
            )}

            {/* Refresh Rate Timer */}
            {hasRefresh && (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="refreshTimer">Refresh Rate (seconds)</Label>
                    <Input
                        id="refreshTimer"
                        type="number"
                        min={MIN_REFRESH_RATE_SECONDS}
                        value={refreshTimer}
                        onChange={(e) => setRefreshTimer(e.target.value)}
                    />
                    <p className="text-[0.8rem] text-muted-foreground">
                        Minimum refresh rate is {MIN_REFRESH_RATE_SECONDS}s.
                    </p>
                </div>
            )}
        </div>
    );
}
