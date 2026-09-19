import { useEffect, useRef } from 'react';

/**
 * Hook to auto-refresh widget data.
 * @param refreshRate - Refresh interval in seconds.
 * @param fetchFn - Function to fetch data.
 */
export function useWidgetTimer(refreshRate: number, fetchFn: () => void) {
    const savedFetchFn = useRef<() => void>(fetchFn);

    // Remember the latest callback if it changes.
    useEffect(() => {
        savedFetchFn.current = fetchFn;
    }, [fetchFn]);

    useEffect(() => {
        if (!refreshRate || refreshRate <= 0) return;

        // Fetch immediately
        if (savedFetchFn.current) {
            savedFetchFn.current();
        }

        const intervalId = setInterval(() => {
            if (savedFetchFn.current) {
                savedFetchFn.current();
            }
        }, refreshRate * 1000);

        return () => clearInterval(intervalId);
    }, [refreshRate]);
}
