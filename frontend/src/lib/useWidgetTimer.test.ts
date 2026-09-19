import { renderHook } from '@testing-library/react';
import { useWidgetTimer } from './useWidgetTimer';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useWidgetTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('calls fetchFn immediately and then on interval', () => {
        const fetchFn = vi.fn();
        const refreshRate = 5; // 5 seconds

        renderHook(() => useWidgetTimer(refreshRate, fetchFn));

        // Called immediately
        expect(fetchFn).toHaveBeenCalledTimes(1);

        // Advance by 5 seconds
        vi.advanceTimersByTime(5000);
        expect(fetchFn).toHaveBeenCalledTimes(2);

        // Advance by another 5 seconds
        vi.advanceTimersByTime(5000);
        expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    it('does not set interval if refreshRate is 0', () => {
        const fetchFn = vi.fn();
        const refreshRate = 0;

        renderHook(() => useWidgetTimer(refreshRate, fetchFn));

        expect(fetchFn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(5000);
        expect(fetchFn).not.toHaveBeenCalled();
    });

    it('cleans up interval on unmount', () => {
        const fetchFn = vi.fn();
        const refreshRate = 5;

        const { unmount } = renderHook(() => useWidgetTimer(refreshRate, fetchFn));

        expect(fetchFn).toHaveBeenCalledTimes(1);

        unmount();

        vi.advanceTimersByTime(5000);
        // Should not be called again after unmount
        expect(fetchFn).toHaveBeenCalledTimes(1);
    });
});
