import { useEffect, useRef } from 'react';

/**
 * Hook to auto-refresh widget data.
 * @param {number} refreshRate - Refresh interval in seconds.
 * @param {function} fetchFn - Function to fetch data.
 */
export function useWidgetTimer(refreshRate, fetchFn) {
    const savedFetchFn = useRef();

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
