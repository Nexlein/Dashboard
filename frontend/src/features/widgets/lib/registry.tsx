import i18n from '@/i18n';
import { lazy } from 'react';
import type { ServiceDefinition, WidgetDefinition } from './types';

/** Share an in-flight import between preloading and the first render. */
type LazyFactory = Parameters<typeof lazy>[0];

function lazyComponent<Component extends Awaited<ReturnType<LazyFactory>>['default']>(
    factory: () => Promise<{ default: Component }>,
) {
    let promise: ReturnType<typeof factory> | undefined;
    const load = () => (promise ??= factory());
    return Object.assign(lazy(load), { preload: load });
}

const CurrentWeather = lazyComponent(() =>
    import('../catalog/WeatherWidgets').then((module) => ({ default: module.CurrentWeather })),
);
const Forecast = lazyComponent(() =>
    import('../catalog/WeatherWidgets').then((module) => ({ default: module.Forecast })),
);
const GithubRepoWidget = lazyComponent(() =>
    import('../catalog/GithubWidgets').then((module) => ({ default: module.GithubRepoWidget })),
);
const GithubProfileWidget = lazyComponent(() =>
    import('../catalog/GithubWidgets').then((module) => ({ default: module.GithubProfileWidget })),
);
const GithubCommitsWidget = lazyComponent(() =>
    import('../catalog/GithubWidgets').then((module) => ({ default: module.GithubCommitsWidget })),
);
const YouTubeVideoWidget = lazyComponent(() =>
    import('../catalog/YouTubeVideoWidget').then((module) => ({
        default: module.YouTubeVideoWidget,
    })),
);
const YouTubeWatchWidget = lazyComponent(() =>
    import('../catalog/YouTubeWatchWidget').then((module) => ({
        default: module.YouTubeWatchWidget,
    })),
);
const CryptoPrice = lazyComponent(() =>
    import('../catalog/CryptoPrice').then((module) => ({ default: module.CryptoPrice })),
);
const CryptoChartWidget = lazyComponent(() =>
    import('../catalog/CryptoChartWidget').then((module) => ({
        default: module.CryptoChartWidget,
    })),
);
const StockProfileWidget = lazyComponent(() =>
    import('../catalog/StockProfileWidget').then((module) => ({
        default: module.StockProfileWidget,
    })),
);
const StockMarketWidget = lazyComponent(() =>
    import('../catalog/StockMarketWidget').then((module) => ({
        default: module.StockMarketWidget,
    })),
);
const ChatbotWidget = lazyComponent(() =>
    import('../catalog/ChatbotWidget').then((module) => ({ default: module.ChatbotWidget })),
);
const OllamaModelManager = lazyComponent(() =>
    import('../catalog/OllamaModelManager').then((module) => ({
        default: module.OllamaModelManager,
    })),
);

export const REGISTRY: Record<string, ServiceDefinition> = {
    weather: {
        get name() {
            return i18n.t('widgets:weather');
        },
        hasRefresh: true,
        widgets: [
            {
                id: 'current_weather',
                get name() {
                    return i18n.t('widgets:currentTemperature');
                },
                component: CurrentWeather,
                params: [
                    {
                        id: 'city',
                        get label() {
                            return i18n.t('widgets:city');
                        },
                        type: 'text',
                        get placeholder() {
                            return i18n.t('widgets:cityExample');
                        },
                    },
                ],
            },
            {
                id: 'forecast',
                get name() {
                    return i18n.t('widgets:forecast');
                },
                component: Forecast,
                params: [
                    {
                        id: 'city',
                        get label() {
                            return i18n.t('widgets:city');
                        },
                        type: 'text',
                        get placeholder() {
                            return i18n.t('widgets:cityExample');
                        },
                    },
                ],
            },
        ],
    },
    github: {
        name: 'GitHub',
        hasRefresh: true,
        widgets: [
            {
                id: 'repo_stats',
                aliases: ['github-repo'],
                get name() {
                    return i18n.t('widgets:repositoryStats');
                },
                component: GithubRepoWidget,
                params: [
                    {
                        id: 'account',
                        get label() {
                            return i18n.t('widgets:githubAccount');
                        },
                        type: 'account',
                        service: 'github',
                    },
                    {
                        id: 'owner',
                        get label() {
                            return i18n.t('widgets:ownerDetailed');
                        },
                        type: 'text',
                        get placeholder() {
                            return i18n.t('widgets:ownerExample');
                        },
                    },
                    {
                        id: 'repo',
                        get label() {
                            return i18n.t('widgets:repository');
                        },
                        type: 'text',
                        get placeholder() {
                            return i18n.t('widgets:repositoryExample');
                        },
                    },
                ],
            },
            {
                id: 'latest_commits',
                aliases: ['github-commits'],
                get name() {
                    return i18n.t('widgets:commits');
                },
                component: GithubCommitsWidget,
                params: [
                    {
                        id: 'account',
                        get label() {
                            return i18n.t('widgets:githubAccount');
                        },
                        type: 'account',
                        service: 'github',
                    },
                    {
                        id: 'owner',
                        get label() {
                            return i18n.t('widgets:owner');
                        },
                        type: 'text',
                        get placeholder() {
                            return i18n.t('widgets:ownerExample');
                        },
                    },
                    {
                        id: 'repo',
                        get label() {
                            return i18n.t('widgets:repository');
                        },
                        type: 'text',
                        get placeholder() {
                            return i18n.t('widgets:repositoryExample');
                        },
                    },
                    {
                        id: 'branch',
                        get label() {
                            return i18n.t('widgets:branch');
                        },
                        optional: true,
                        type: 'text',
                        get placeholder() {
                            return i18n.t('widgets:branchExample');
                        },
                    },
                ],
            },
            {
                id: 'user_profile',
                aliases: ['github-user'],
                get name() {
                    return i18n.t('widgets:userProfile');
                },
                component: GithubProfileWidget,
                params: [
                    {
                        id: 'account',
                        get label() {
                            return i18n.t('widgets:githubAccount');
                        },
                        type: 'account',
                        service: 'github',
                    },
                    {
                        id: 'username',
                        get label() {
                            return i18n.t('widgets:githubUsername');
                        },
                        optional: true,
                        type: 'text',
                        get placeholder() {
                            return i18n.t('widgets:usernameExample');
                        },
                    },
                ],
            },
        ],
    },
    youtube: {
        name: 'YouTube',
        hasRefresh: true,
        widgets: [
            {
                id: 'video_player',
                get name() {
                    return i18n.t('widgets:videoPlayer');
                },
                component: YouTubeVideoWidget,
                hasRefresh: false,
                fullBleed: true,
                params: [
                    {
                        id: 'video_url',
                        get label() {
                            return i18n.t('widgets:videoLink');
                        },
                        type: 'text',
                        placeholder: 'https://www.youtube.com/watch?v=...',
                    },
                ],
            },
            {
                id: 'channel_watch',
                get name() {
                    return i18n.t('widgets:channelWatch');
                },
                component: YouTubeWatchWidget,
                params: [
                    {
                        id: 'channels',
                        get label() {
                            return i18n.t('widgets:youtubeChannels');
                        },
                        type: 'youtube-channels',
                    },
                ],
            },
        ],
    },
    crypto: {
        get name() {
            return i18n.t('widgets:crypto');
        },
        hasRefresh: true,
        widgets: [
            {
                id: 'crypto_price',
                get name() {
                    return i18n.t('widgets:priceStats');
                },
                component: CryptoPrice,
                params: [
                    {
                        id: 'coin',
                        get label() {
                            return i18n.t('widgets:coinIdLabel');
                        },
                        type: 'text',
                        get placeholder() {
                            return i18n.t('widgets:coinExample');
                        },
                    },
                    {
                        id: 'currency',
                        get label() {
                            return i18n.t('widgets:currency');
                        },
                        type: 'text',
                        get placeholder() {
                            return i18n.t('widgets:currencyExample');
                        },
                    },
                ],
            },
            {
                id: 'crypto_chart',
                get name() {
                    return i18n.t('widgets:marketComparison');
                },
                component: CryptoChartWidget,
                params: [
                    {
                        id: 'coins',
                        get label() {
                            return i18n.t('widgets:cryptocurrencies');
                        },
                        type: 'coin-multiselect',
                        get placeholder() {
                            return i18n.t('widgets:customCoinExample');
                        },
                        options: [
                            { value: 'bitcoin', label: 'BTC' },
                            { value: 'ethereum', label: 'ETH' },
                            { value: 'solana', label: 'SOL' },
                            { value: 'binancecoin', label: 'BNB' },
                            { value: 'ripple', label: 'XRP' },
                            { value: 'cardano', label: 'ADA' },
                            { value: 'dogecoin', label: 'DOGE' },
                            { value: 'avalanche-2', label: 'AVAX' },
                            { value: 'chainlink', label: 'LINK' },
                            { value: 'polkadot', label: 'DOT' },
                        ],
                    },
                    {
                        id: 'currency',
                        get label() {
                            return i18n.t('widgets:currency');
                        },
                        type: 'select',
                        get placeholder() {
                            return i18n.t('widgets:selectCurrency');
                        },
                        options: [
                            { value: 'eur', label: 'EUR (€)' },
                            { value: 'usd', label: 'USD ($)' },
                            { value: 'gbp', label: 'GBP (£)' },
                        ],
                    },
                    {
                        id: 'days',
                        get label() {
                            return i18n.t('widgets:period');
                        },
                        type: 'select',
                        get placeholder() {
                            return i18n.t('widgets:selectPeriod');
                        },
                        options: [
                            {
                                value: '7',
                                get label() {
                                    return i18n.t('widgets:week');
                                },
                            },
                            {
                                value: '30',
                                get label() {
                                    return i18n.t('widgets:month');
                                },
                            },
                            {
                                value: '90',
                                get label() {
                                    return i18n.t('widgets:threeMonths');
                                },
                            },
                            {
                                value: '365',
                                get label() {
                                    return i18n.t('widgets:year');
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    },
    stocks: {
        get name() {
            return i18n.t('widgets:stockMarket');
        },
        hasRefresh: true,
        periodParam: 'period',
        quotaLimited: true,
        widgets: [
            {
                id: 'stock_market',
                get name() {
                    return i18n.t('widgets:stockComparison');
                },
                component: StockMarketWidget,
                params: [
                    {
                        id: 'symbols',
                        get label() {
                            return i18n.t('widgets:companies');
                        },
                        type: 'stock-multiselect',
                        get placeholder() {
                            return i18n.t('widgets:stockSearchExample');
                        },
                        options: [
                            { value: 'AAPL', label: 'Apple' },
                            { value: 'NVDA', label: 'NVIDIA' },
                            { value: 'MSFT', label: 'Microsoft' },
                            { value: 'TSLA', label: 'Tesla' },
                        ],
                    },
                    {
                        id: 'period',
                        get label() {
                            return i18n.t('widgets:period');
                        },
                        type: 'segmented',
                        defaultValue: '1M',
                        get placeholder() {
                            return i18n.t('widgets:selectPeriod');
                        },
                        options: [
                            {
                                value: '1W',
                                get label() {
                                    return i18n.t('widgets:week');
                                },
                            },
                            {
                                value: '1M',
                                get label() {
                                    return i18n.t('widgets:month');
                                },
                            },
                            {
                                value: '1Y',
                                get label() {
                                    return i18n.t('widgets:year');
                                },
                            },
                            {
                                value: '5Y',
                                get label() {
                                    return i18n.t('widgets:fiveYears');
                                },
                            },
                            {
                                value: 'ALL',
                                get label() {
                                    return i18n.t('widgets:allHistory');
                                },
                            },
                        ],
                    },
                ],
            },
            {
                id: 'stock_profile',
                get name() {
                    return i18n.t('widgets:stockProfile');
                },
                component: StockProfileWidget,
                params: [
                    {
                        id: 'symbols',
                        get label() {
                            return i18n.t('widgets:company');
                        },
                        type: 'stock-select',
                        get placeholder() {
                            return i18n.t('widgets:stockSearchExample');
                        },
                        options: [
                            { value: 'AAPL', label: 'Apple' },
                            { value: 'NVDA', label: 'NVIDIA' },
                            { value: 'MSFT', label: 'Microsoft' },
                            { value: 'TSLA', label: 'Tesla' },
                        ],
                    },
                    {
                        id: 'period',
                        get label() {
                            return i18n.t('widgets:period');
                        },
                        type: 'segmented',
                        defaultValue: '1M',
                        get placeholder() {
                            return i18n.t('widgets:selectPeriod');
                        },
                        options: [
                            {
                                value: '1W',
                                get label() {
                                    return i18n.t('widgets:week');
                                },
                            },
                            {
                                value: '1M',
                                get label() {
                                    return i18n.t('widgets:month');
                                },
                            },
                            {
                                value: '1Y',
                                get label() {
                                    return i18n.t('widgets:year');
                                },
                            },
                            {
                                value: '5Y',
                                get label() {
                                    return i18n.t('widgets:fiveYears');
                                },
                            },
                            {
                                value: 'ALL',
                                get label() {
                                    return i18n.t('widgets:allHistory');
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    },
    chatbot: {
        name: 'Ollama',
        hasRefresh: false,
        widgets: [
            {
                id: 'ai_chat',
                get name() {
                    return i18n.t('widgets:ollamaChat');
                },
                component: ChatbotWidget,
                customConfigUi: OllamaModelManager,
                params: [
                    {
                        id: 'model',
                        get label() {
                            return i18n.t('widgets:ollamaModel');
                        },
                        type: 'hidden',
                    },
                ],
            },
        ],
    },
};

export function getServiceDefinition(serviceName: string): ServiceDefinition | undefined {
    return Object.hasOwn(REGISTRY, serviceName) ? REGISTRY[serviceName] : undefined;
}

/** Finds a widget by id or by one of its legacy aliases. */
export function findWidgetDefinition(
    serviceName: string,
    widgetName: string,
): WidgetDefinition | undefined {
    return getServiceDefinition(serviceName)?.widgets.find(
        (w) => w.id === widgetName || w.aliases?.includes(widgetName),
    );
}
