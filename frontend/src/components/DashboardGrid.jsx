import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useStore } from '@/store/useStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteWidget, updateWidgetLayouts } from '@/lib/widgets';
import { useRef, useState } from 'react';
import WidgetRenderer from './WidgetRenderer';
import { CloudSun, EllipsisVertical, Trash2, Edit2 } from 'lucide-react';
import { WidgetEditDialog } from './WidgetEditDialog';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardGrid() {
    const { widgets, setWidgets, removeWidget } = useStore();
    const timeoutRef = useRef(null);
    const [editingWidget, setEditingWidget] = useState(null);

    const handleDelete = async (widget) => {
        if (!window.confirm(`Delete ${widget.title}?`)) return;

        try {
            await deleteWidget(Number.parseInt(widget.i, 10));
            removeWidget(widget.i);
        } catch (error) {
            console.error('Failed to delete widget:', error);
        }
    };

    const onLayoutChange = (layout) => {
        // Map new layout to our widgets state
        const updatedWidgets = widgets.map((widget) => {
            const newLayout = layout.find((l) => l.i === widget.i);
            if (newLayout) {
                return {
                    ...widget,
                    x: newLayout.x,
                    y: newLayout.y,
                    w: newLayout.w,
                    h: newLayout.h,
                };
            }
            return widget;
        });
        setWidgets(updatedWidgets);

        // Batch update to backend via debounce
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            const apiLayouts = updatedWidgets.map((w) => ({
                id: parseInt(w.i, 10),
                layout: { x: w.x, y: w.y, w: w.w, h: w.h },
            }));
            updateWidgetLayouts(apiLayouts).catch(console.error);
        }, 1000);
    };

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
                                    <span>{widget.title}</span>
                                </CardTitle>
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                className="cursor-pointer text-muted-foreground"
                                                aria-label={`Configure ${widget.title}`}
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
                                            <Edit2 className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            variant="destructive"
                                            className="min-h-9 px-2 text-destructive"
                                            onClick={() => handleDelete(widget)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
                                <WidgetRenderer widget={widget} />
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </ResponsiveGridLayout>

            <WidgetEditDialog
                widget={editingWidget}
                open={!!editingWidget}
                onOpenChange={(open) => !open && setEditingWidget(null)}
            />
        </div>
    );
}
