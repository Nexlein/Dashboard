import { useState, useCallback } from 'react';
import { useWidgetTimer } from '@/lib/useWidgetTimer';
import { Loader2 } from 'lucide-react';
// Import specific widget implementations when they exist
// e.g. import WeatherWidget from './widgets/WeatherWidget';

export default function WidgetRenderer({ widget }) {
    const { serviceName, widgetName, params, refreshRate } = widget;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // In a real implementation, this would call the backend service
            // e.g. const result = await fetchWidgetData(serviceName, widgetName, params);

            // Mocking the fetch for now since specific services aren't implemented
            await new Promise((resolve) => setTimeout(resolve, 500));
            setData({
                mockData: `Data for ${widgetName} (${serviceName})`,
                timestamp: new Date().toLocaleTimeString(),
                params,
            });
        } catch (err) {
            setError(err.message || 'Failed to fetch widget data');
        } finally {
            setLoading(false);
        }
    }, [serviceName, widgetName, params]);

    useWidgetTimer(refreshRate, fetchData);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <p className="text-destructive text-sm font-medium">Error loading {widgetName}</p>
                <p className="text-muted-foreground text-xs mt-1">{error}</p>
            </div>
        );
    }

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div
            className="flex flex-col h-full w-full p-2 overflow-auto"
            data-testid="widget-renderer-content"
        >
            {/* When real widgets exist, we would render them based on serviceName/widgetName here */}
            {/* e.g. {serviceName === 'weather' ? <WeatherWidget data={data} /> : ...} */}

            <div className="text-sm">
                <p className="font-semibold">
                    {serviceName} / {widgetName}
                </p>
                <pre className="text-xs mt-2 bg-muted p-2 rounded-md overflow-x-auto">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </div>
    );
}
