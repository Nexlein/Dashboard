import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import './index.css';
import App from './App.tsx';

import { ThemeProvider } from '@/components/ThemeProvider';
import { initAccessibility } from '@/lib/accessibility';

// Before the first render, so the page never appears with the default text size first.
initAccessibility();

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider storageKey="dashboard-theme">
                    <App />
                </ThemeProvider>
            </QueryClientProvider>
        </I18nextProvider>
    </StrictMode>,
);
