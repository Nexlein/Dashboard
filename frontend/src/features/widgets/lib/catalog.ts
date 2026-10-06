import type { AboutJson, AboutWidget } from './about';
import { REGISTRY, findWidgetDefinition } from './registry';
import type { ServiceDefinition, WidgetDefinition, WidgetParamDefinition } from './types';

/** A service the configurator offers: the server's widgets that this frontend can display. */
export type CatalogService = ServiceDefinition & { id: string };

const humanize = (name: string) =>
    name.charAt(0).toUpperCase() + name.slice(1).replaceAll('_', ' ');

/**
 * The params of `widget`, as the server declares them. The frontend definition only says how
 * to ask for each one (label, options, field type); a param it does not know gets a plain
 * field, and one the server no longer declares is not asked.
 */
function resolveParams(widget: AboutWidget, definition: WidgetDefinition): WidgetParamDefinition[] {
    return widget.params.map(
        (param) =>
            definition.params.find((hint) => hint.id === param.name) ?? {
                id: param.name,
                label: humanize(param.name),
                type: param.type === 'integer' ? 'number' : 'text',
            },
    );
}

/**
 * What the widget configurator offers, built from /about.json: the services and widgets the
 * server provides, in its order, keeping only those this frontend has a component for.
 */
export function buildCatalog(about: AboutJson): CatalogService[] {
    return about.server.services.flatMap((service) => {
        const presentation = Object.hasOwn(REGISTRY, service.name) ? REGISTRY[service.name] : null;
        if (!presentation) return [];
        const widgets = service.widgets.flatMap((widget) => {
            const definition = findWidgetDefinition(service.name, widget.name);
            if (!definition) return [];
            return [
                {
                    ...definition,
                    id: widget.name,
                    name: definition.name || widget.description,
                    params: resolveParams(widget, definition),
                },
            ];
        });
        return widgets.length ? [{ ...presentation, id: service.name, widgets }] : [];
    });
}

/** The widget `widgetName` of `serviceName` in the catalog, by id or legacy alias. */
export function findCatalogWidget(
    catalog: CatalogService[] | undefined,
    serviceName: string,
    widgetName: string,
): { service: CatalogService; widget: WidgetDefinition } | undefined {
    const service = catalog?.find((item) => item.id === serviceName);
    const widget = service?.widgets.find(
        (item) => item.id === widgetName || item.aliases?.includes(widgetName),
    );
    return service && widget ? { service, widget } : undefined;
}
