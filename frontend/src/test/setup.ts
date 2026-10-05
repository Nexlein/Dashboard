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
