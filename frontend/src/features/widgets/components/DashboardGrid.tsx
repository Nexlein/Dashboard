import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
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
import { useState } from 'react';
import WidgetRenderer from './WidgetRenderer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Bitcoin, CloudSun, Edit2, EllipsisVertical, Trash2, Loader2 } from 'lucide-react';
import { WidgetEditDialog } from './WidgetEditDialog';
import type { DashboardWidget } from '@/features/widgets/lib/widgets';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardGrid() {
    const { data: widgets = [], isLoading } = useWidgets();
    const removeMutation = useRemoveWidget();
    const { onLayoutChange } = useWidgetLayoutManager();

    const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);

    const handleDelete = (widget: DashboardWidget) => {
        if (!window.confirm(`Delete ${widget.title}?`)) return;
        removeMutation.mutate(widget.id);
    };

    if (isLoading) {
        return (
            <div className="flex min-h-100 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-4">
            <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: widgets }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={100}
                onLayoutChange={onLayoutChange}
                isDraggable={true}
                isResizable={true}
            >
                {widgets.map((widget) => (
                    <div key={widget.i} data-grid={widget}>
                        <Card className="flex h-full w-full cursor-move flex-col overflow-hidden">
                            <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border bg-muted/50 p-4">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    {widget.serviceName === 'weather' && (
                                        <CloudSun
                                            aria-hidden="true"
                                            className="h-5 w-5 text-sky-500"
                                        />
                                    )}
                                    {widget.serviceName === 'crypto' && (
                                        <Bitcoin
                                            aria-hidden="true"
                                            className="h-5 w-5 text-amber-500"
                                        />
                                    )}
                                    <span>{widget.title}</span>
                                </CardTitle>
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={
                                            <Button
                                                type="button"
                                                aria-label={`Configure ${widget.title}`}
                                                variant="ghost"
                                                size="icon-sm"
                                                className="cursor-pointer text-muted-foreground"
                                                onPointerDown={(event) => event.stopPropagation()}
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
                                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            variant="destructive"
                                            className="min-h-9 px-2 text-destructive"
                                            onClick={() => handleDelete(widget)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
                                <ErrorBoundary>
                                    <WidgetRenderer widget={widget} />
                                </ErrorBoundary>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </ResponsiveGridLayout>

            {editingWidget && (
                <WidgetEditDialog
                    key={editingWidget.id}
                    widget={editingWidget}
                    open={!!editingWidget}
                    onOpenChange={(open: boolean) => !open && setEditingWidget(null)}
                />
            )}
        </div>
    );
}
