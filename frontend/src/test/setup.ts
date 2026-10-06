import { afterEach } from 'vitest';
import { queryClient } from '@/test-utils';
import '@testing-library/jest-dom/vitest';

// ResizeObserver is missing from happy-dom
globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Pointer capture and scrollIntoView are used by Radix Select and are missing from happy-dom.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

// Tests share one QueryClient: start each one without the answers of the previous ones.
afterEach(() => queryClient.clear());
