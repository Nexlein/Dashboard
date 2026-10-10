import { useTranslation } from 'react-i18next';
import { Responsive } from 'react-grid-layout/legacy';
import { useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWidgets, useRemoveWidget } from '@/features/widgets/hooks/useWidgets';
import { useWidgetLayoutManager } from '@/features/widgets/hooks/useWidgetLayoutManager';
import { lazy, Suspense, useEffect, useId, useState, type KeyboardEvent } from 'react';
import WidgetRenderer from './WidgetRenderer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Edit2, EllipsisVertical, Trash2, Loader2, Move } from 'lucide-react';
import { ServiceLogo } from '@/features/services/components/ServiceLogo';
import { findWidgetDefinition } from '@/features/widgets/lib/registry';
import type { DashboardWidget } from '@/features/widgets/lib/widgets';
import { getWidgetTitle } from '@/features/widgets/lib/widgets';
import { useAccessibility } from '@/lib/accessibility';
import type { LayoutChange } from '@/features/widgets/hooks/useWidgetLayoutManager';

/** Arrow keys move a widget one cell; with Shift they resize it. */
const KEY_CHANGES: Record<string, [LayoutChange, LayoutChange]> = {
    ArrowLeft: [{ dx: -1 }, { dw: -1 }],
    ArrowRight: [{ dx: 1 }, { dw: 1 }],
    ArrowUp: [{ dy: -1 }, { dh: -1 }],
    ArrowDown: [{ dy: 1 }, { dh: 1 }],
};

const WidgetEditDialog = lazy(() =>
    import('./WidgetEditDialog').then((module) => ({ default: module.WidgetEditDialog })),
);

export default function DashboardGrid() {
    const { t } = useTranslation(['widgets', 'common']);
    const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
    const { data: widgets = [], isLoading } = useWidgets();
    const removeMutation = useRemoveWidget();
    const { onLayoutChange, changeWidget } = useWidgetLayoutManager();
    // Rows grow with the text size, so enlarged text still fits in its widget.
    const { textSize } = useAccessibility();
    const helpId = useId();
    const [announcement, setAnnouncement] = useState('');
    // The grid keeps its own layout for narrower screens and ignores later changes to it:
    // a keyboard move draws the grid again, then gives focus back to the moved widget.
    const [keyboardMove, setKeyboardMove] = useState({ count: 0, id: 0 });
    useEffect(() => {
        if (!keyboardMove.id) return;
        document.querySelector<HTMLElement>(`[data-move-handle="${keyboardMove.id}"]`)?.focus();
    }, [keyboardMove]);

    const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);

    const handleDelete = (widget: DashboardWidget) => {
        if (!window.confirm(t('widgets:deleteConfirm', { name: getWidgetTitle(widget) }))) return;
        removeMutation.mutate(widget.id);
    };

    const handleMoveKey = (event: KeyboardEvent, widget: DashboardWidget) => {
        const change = KEY_CHANGES[event.key]?.[event.shiftKey ? 1 : 0];
        if (!change) return;
        event.preventDefault();
        const layout = changeWidget(widget.id, change);
        if (!layout) return;
        setKeyboardMove(({ count }) => ({ count: count + 1, id: widget.id }));
        const name = getWidgetTitle(widget);
        setAnnouncement(
            event.shiftKey
                ? t('widgets:resized', { name, w: layout.w, h: layout.h })
                : change.dy
                  ? t(change.dy > 0 ? 'widgets:movedDown' : 'widgets:movedUp', { name })
                  : t('widgets:moved', { name, x: layout.x + 1 }),
        );
    };

    return (
        <div className="p-4" ref={containerRef}>
            <p id={helpId} className="sr-only">
                {t('widgets:moveHelp')}
            </p>
            <p role="status" aria-live="polite" className="sr-only">
                {announcement}
            </p>
            {isLoading ? (
                <div className="flex min-h-100 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : mounted ? (
                <Responsive
                    key={keyboardMove.count}
                    width={width}
                    className="layout"
                    layouts={{ lg: widgets }}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={Math.round((100 * textSize) / 100)}
                    onLayoutChange={onLayoutChange}
                    isDraggable={true}
                    isResizable={true}
                >
                    {widgets.map((widget) => (
                        <div key={widget.i} data-grid={widget}>
                            <Card className="flex h-full w-full cursor-move flex-col overflow-hidden">
                                <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border bg-muted/50 p-4">
                                    <CardTitle as="h2" className="flex items-center gap-2 text-sm">
                                        <ServiceLogo
                                            name={widget.serviceName}
                                            size="sm"
                                            decorative
                                        />
                                        <span>{getWidgetTitle(widget)}</span>
                                    </CardTitle>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="cursor-pointer text-muted-foreground"
                                            aria-label={t('widgets:moveHandle', {
                                                name: getWidgetTitle(widget),
                                            })}
                                            aria-describedby={helpId}
                                            data-move-handle={widget.id}
                                            title={t('widgets:moveHelp')}
                                            onPointerDown={(event) => event.stopPropagation()}
                                            onKeyDown={(event) => handleMoveKey(event, widget)}
                                        >
                                            <Move className="h-4 w-4" />
                                        </Button>
                                        <DropdownMenu modal={false}>
                                            <DropdownMenuTrigger
                                                render={
                                                    <Button
                                                        type="button"
                                                        aria-label={t('widgets:configure', {
                                                            name: getWidgetTitle(widget),
                                                        })}
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="cursor-pointer text-muted-foreground"
                                                        onPointerDown={(event) =>
                                                            event.stopPropagation()
                                                        }
                                                    />
                                                }
                                            >
                                                <EllipsisVertical className="h-4 w-4" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                sideOffset={6}
                                                className="w-36"
                                            >
                                                <DropdownMenuItem
                                                    className="min-h-9 px-2"
                                                    onClick={() => setEditingWidget(widget)}
                                                >
                                                    <Edit2 className="mr-2 h-4 w-4" />
                                                    {t('common:edit')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    variant="destructive"
                                                    className="min-h-9 px-2 text-destructive"
                                                    onClick={() => handleDelete(widget)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {t('common:delete')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent
                                    className={`flex min-h-0 flex-1 items-center justify-center ${
                                        findWidgetDefinition(widget.serviceName, widget.widgetName)
                                            ?.fullBleed
                                            ? 'overflow-hidden p-0'
                                            : 'overflow-auto p-4'
                                    }`}
                                >
                                    <ErrorBoundary
                                        key={`${widget.id}:${JSON.stringify(widget.params)}`}
                                    >
                                        <WidgetRenderer widget={widget} />
                                    </ErrorBoundary>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </Responsive>
            ) : null}

            {editingWidget && (
                <Suspense fallback={null}>
                    <WidgetEditDialog
                        key={editingWidget.id}
                        widget={editingWidget}
                        open={!!editingWidget}
                        onOpenChange={(open: boolean) => !open && setEditingWidget(null)}
                    />
                </Suspense>
            )}
        </div>
    );
}
