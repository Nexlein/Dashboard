import { defineConfig } from '@playwright/test';
import previewConfig from './i18n.config';

export default defineConfig({
    ...previewConfig,
    testMatch: 'dashboard-accessibility.spec.ts',
});
