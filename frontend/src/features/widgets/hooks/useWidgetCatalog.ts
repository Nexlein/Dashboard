import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchAbout } from '../lib/about';
import type { AboutJson } from '../lib/about';
import { buildCatalog } from '../lib/catalog';

/**
 * The services and widgets the configurator offers, from /about.json: fetched once, when
 * `enabled` first becomes true (the configurator opens).
 */
export function useWidgetCatalog(enabled = true) {
    const { i18n } = useTranslation();
    const language = i18n.resolvedLanguage;
    const select = useCallback(
        (about: AboutJson) => {
            // The callback identity invalidates React Query's presentation cache on language changes.
            void language;
            return buildCatalog(about);
        },
        [language],
    );
    return useQuery({
        enabled,
        queryKey: ['about'],
        queryFn: fetchAbout,
        select,
        staleTime: Infinity,
    });
}
