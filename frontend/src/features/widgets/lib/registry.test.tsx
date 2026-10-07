import { Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { makeAbout, makeWidget } from '@/test/fixtures';
import { buildCatalog } from './catalog';
import { findWidgetDefinition, REGISTRY } from './registry';

const imports = vi.hoisted(() => ({ video: vi.fn(), models: vi.fn() }));
vi.mock('../catalog/YouTubeVideoWidget', () => {
    imports.video();
    return { YouTubeVideoWidget: () => <p>Preloaded video player</p> };
});
vi.mock('../catalog/OllamaModelManager', () => {
    imports.models();
    return { OllamaModelManager: () => <p>Model manager</p> };
});

const about = makeAbout([
    {
        name: 'weather',
        widgets: ['current_weather', 'forecast'].map((name) => ({
            name,
            description: name,
            params: [{ name: 'city', type: 'string' }],
        })),
    },
    {
        name: 'github',
        widgets: [
            { name: 'repo_stats', params: ['account', 'owner', 'repo'] },
            { name: 'latest_commits', params: ['account', 'owner', 'repo', 'branch'] },
            { name: 'user_profile', params: ['account', 'username'] },
        ].map(({ name, params }) => ({
            name,
            description: name,
            params: params.map((name) => ({ name, type: 'string' })),
        })),
    },
    {
        name: 'youtube',
        widgets: [
            {
                name: 'video_player',
                description: 'Player',
                params: [{ name: 'video_url', type: 'string' }],
            },
            {
                name: 'channel_watch',
                description: 'Channels',
                params: [{ name: 'channels', type: 'string' }],
            },
        ],
    },
    {
        name: 'crypto',
        widgets: [
            { name: 'crypto_price', params: ['coin', 'currency'] },
            { name: 'crypto_chart', params: ['coins', 'currency', 'days'] },
        ].map(({ name, params }) => ({
            name,
            description: name,
            params: params.map((name) => ({ name, type: 'string' })),
        })),
    },
    {
        name: 'stocks',
        widgets: ['stock_market', 'stock_profile'].map((name) => ({
            name,
            description: name,
            params: ['symbols', 'period'].map((name) => ({ name, type: 'string' })),
        })),
    },
    {
        name: 'chatbot',
        widgets: [
            { name: 'ai_chat', description: 'Chat', params: [{ name: 'model', type: 'string' }] },
        ],
    },
]);

afterEach(async () => {
    await i18n.changeLanguage('en');
});

describe('localized widget catalog', () => {
    it('translates the complete catalog while preserving API identifiers, defaults and options', async () => {
        const english = buildCatalog(about);
        const configuration = (catalog: typeof english) =>
            catalog.map((service) => ({
                id: service.id,
                widgets: service.widgets.map((widget) => ({
                    id: widget.id,
                    aliases: widget.aliases,
                    component: widget.component,
                    params: widget.params.map((param) => ({
                        id: param.id,
                        type: param.type,
                        defaultValue: param.defaultValue,
                        optional: param.optional,
                        values: param.options?.map((option) => option.value),
                    })),
                })),
            }));
        const descriptions = (catalog: typeof english) =>
            catalog.flatMap((service) =>
                service.widgets.map((widget) => ({
                    name: widget.name,
                    fields: widget.params.map((param) => ({
                        label: param.label,
                        placeholder: param.placeholder,
                        options: param.options?.map((option) => option.label),
                    })),
                })),
            );
        const englishDescriptions = descriptions(english);
        expect(englishDescriptions.map((widget) => widget.name)).toEqual([
            'Current Temperature',
            '5-Day Forecast',
            'Repository Stats',
            'Latest Commits',
            'User Profile',
            'Video Player',
            'Channel Watch',
            'Price & Market Stats',
            'Market Comparison Chart',
            'Stock Comparison Chart',
            'Stock Profile',
            'Ollama Chat',
        ]);
        await i18n.changeLanguage('fr');
        const french = buildCatalog(about);
        expect(configuration(french)).toEqual(configuration(english));
        const frenchDescriptions = descriptions(french);
        expect(frenchDescriptions.map((widget) => widget.name)).toEqual([
            'Température actuelle',
            'Prévisions sur 5 jours',
            'Statistiques du dépôt',
            'Derniers commits',
            'Profil utilisateur',
            'Lecteur vidéo',
            'Suivi des chaînes',
            'Cours et statistiques du marché',
            'Graphique de comparaison du marché',
            'Graphique de comparaison des actions',
            'Fiche de l’entreprise',
            'Discussion Ollama',
        ]);
        for (const [index, widget] of frenchDescriptions.entries()) {
            for (const [fieldIndex, field] of widget.fields.entries()) {
                expect(field.label).not.toBe(englishDescriptions[index].fields[fieldIndex].label);
                expect(field.label).not.toMatch(/^widgets:/);
            }
        }
        expect(frenchDescriptions[0].fields[0]).toMatchObject({
            label: 'Nom de la ville',
            placeholder: 'ex. Paris',
        });
        const period = french[4].widgets[0].params.find((param) => param.id === 'period');
        expect(period?.options?.map((option) => option.label)).toEqual([
            '1 semaine',
            '1 mois',
            '1 an',
            '5 ans',
            'Tout l’historique disponible',
        ]);
    });

    it('resolves saved legacy widget names and rejects unknown or inherited service names', () => {
        expect(findWidgetDefinition('github', 'github-repo')).toBe(
            findWidgetDefinition('github', 'repo_stats'),
        );
        expect(findWidgetDefinition('github', 'github-commits')).toBe(
            findWidgetDefinition('github', 'latest_commits'),
        );
        expect(findWidgetDefinition('github', 'github-user')).toBe(
            findWidgetDefinition('github', 'user_profile'),
        );
        expect(findWidgetDefinition('weather', 'unknown')).toBeUndefined();
        expect(findWidgetDefinition('constructor', 'repo_stats')).toBeUndefined();
        expect(findWidgetDefinition('__proto__', 'repo_stats')).toBeUndefined();
    });

    it('shares the selected component import between concurrent preloads and rendering', async () => {
        expect(imports.video).not.toHaveBeenCalled();
        expect(imports.models).not.toHaveBeenCalled();
        const video = REGISTRY.youtube.widgets[0];
        const first = video.component.preload!();
        expect(video.component.preload!()).toBe(first);
        await first;
        expect(imports.video).toHaveBeenCalledOnce();
        const Player = video.component;
        await act(async () => {
            render(
                <Suspense fallback={<p>Loading video</p>}>
                    <Player
                        widget={makeWidget({ serviceName: 'youtube', widgetName: 'video_player' })}
                        data={undefined as never}
                        onPeriodChange={vi.fn()}
                        periodUpdating={false}
                    />
                </Suspense>,
            );
        });
        expect(screen.getByText('Preloaded video player')).toBeInTheDocument();
        expect(imports.video).toHaveBeenCalledOnce();
        expect(imports.models).not.toHaveBeenCalled();
    });
});
