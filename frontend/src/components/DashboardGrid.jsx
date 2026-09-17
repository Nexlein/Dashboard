import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useStore } from '@/store/useStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { updateWidgetLayouts } from '@/lib/widgets';
import { useRef } from 'react';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardGrid() {
    const { widgets, setWidgets } = useStore();
    const timeoutRef = useRef(null);

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
                        <Card className="w-full h-full cursor-move overflow-hidden">
                            <CardHeader className="p-4 bg-muted/50 border-b border-border">
                                <CardTitle className="text-sm">{widget.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">Widget Content</p>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
}
