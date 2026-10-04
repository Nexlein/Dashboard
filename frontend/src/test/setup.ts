import '@testing-library/jest-dom/vitest';

// ResizeObserver is missing from happy-dom
globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};
