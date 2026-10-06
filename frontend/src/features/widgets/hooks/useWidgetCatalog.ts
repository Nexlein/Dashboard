import { useQuery } from '@tanstack/react-query';
import { fetchAbout } from '../lib/about';
import { buildCatalog } from '../lib/catalog';

/**
 * The services and widgets the configurator offers, from /about.json: fetched once, when
 * `enabled` first becomes true (the configurator opens).
 */
export function useWidgetCatalog(enabled = true) {
    return useQuery({
        enabled,
        queryKey: ['about'],
        queryFn: fetchAbout,
        select: buildCatalog,
        staleTime: Infinity,
    });
}
