import { CurrentWeather, Forecast } from '@/features/widgets/catalog/WeatherWidgets';
import {
    GithubRepoWidget,
    GithubProfileWidget,
    GithubCommitsWidget,
} from '@/features/widgets/catalog/GithubWidgets';
import { YouTubeVideoWidget } from '@/features/widgets/catalog/YouTubeVideoWidget';
import { CryptoPrice } from '@/features/widgets/catalog/CryptoPrice';
import { CryptoChartWidget } from '@/features/widgets/catalog/CryptoChartWidget';
import { StockProfileWidget } from '@/features/widgets/catalog/StockProfileWidget';
import { StockMarketWidget } from '@/features/widgets/catalog/StockMarketWidget';
import { ChatbotWidget } from '@/features/widgets/catalog/ChatbotWidget';
import { OllamaModelManager } from '@/features/widgets/catalog/OllamaModelManager';
import type { ServiceDefinition, WidgetDefinition } from './types';

export const REGISTRY: Record<string, ServiceDefinition> = {
    weather: {
        name: 'Weather',
        hasRefresh: true,
        widgets: [
            {
                id: 'current_weather',
                name: 'Current Temperature',
                component: CurrentWeather,
                params: [
                    { id: 'city', label: 'City Name', type: 'text', placeholder: 'e.g. Paris' },
                ],
            },
            {
                id: 'forecast',
                name: '5-Day Forecast',
                component: Forecast,
                params: [
                    { id: 'city', label: 'City Name', type: 'text', placeholder: 'e.g. Paris' },
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
                name: 'Repository Stats',
                component: GithubRepoWidget,
                params: [
                    {
                        id: 'account',
                        label: 'GitHub account',
                        type: 'account',
                        service: 'github',
                    },
                    {
                        id: 'owner',
                        label: 'Owner (Organization/User)',
                        type: 'text',
                        placeholder: 'e.g. facebook',
                    },
                    {
                        id: 'repo',
                        label: 'Repository Name',
                        type: 'text',
                        placeholder: 'e.g. react',
                    },
                ],
            },
            {
                id: 'latest_commits',
                aliases: ['github-commits'],
                name: 'Latest Commits',
                component: GithubCommitsWidget,
                params: [
                    {
                        id: 'account',
                        label: 'GitHub account',
                        type: 'account',
                        service: 'github',
                    },
                    { id: 'owner', label: 'Owner', type: 'text', placeholder: 'e.g. facebook' },
                    {
                        id: 'repo',
                        label: 'Repository Name',
                        type: 'text',
                        placeholder: 'e.g. react',
                    },
                    {
                        id: 'branch',
                        label: 'Branch (optional)',
                        optional: true,
                        type: 'text',
                        placeholder: 'e.g. main',
                    },
                ],
            },
            {
                id: 'user_profile',
                aliases: ['github-user'],
                name: 'User Profile',
                component: GithubProfileWidget,
                params: [
                    {
                        id: 'account',
                        label: 'GitHub account',
                        type: 'account',
                        service: 'github',
                    },
                    {
                        id: 'username',
                        label: 'GitHub Username (leave empty for your profile)',
                        optional: true,
                        type: 'text',
                        placeholder: 'e.g. nexlein',
                    },
                ],
            },
        ],
    },
    youtube: {
        name: 'YouTube',
        hasRefresh: false,
        widgets: [
            {
                id: 'video_player',
                name: 'Video Player',
                component: YouTubeVideoWidget,
                params: [
                    {
                        id: 'video_url',
                        label: 'YouTube video link',
                        type: 'text',
                        placeholder: 'https://www.youtube.com/watch?v=...',
                    },
                ],
            },
        ],
    },
    crypto: {
        name: 'Crypto',
        hasRefresh: true,
        widgets: [
            {
                id: 'crypto_price',
                name: 'Price & Market Stats',
                component: CryptoPrice,
                params: [
                    {
                        id: 'coin',
                        label: 'CoinGecko Coin ID',
                        type: 'text',
                        placeholder: 'e.g. bitcoin, ethereum, solana',
                    },
                    {
                        id: 'currency',
                        label: 'Currency',
                        type: 'text',
                        placeholder: 'e.g. eur or usd',
                    },
                ],
            },
            {
                id: 'crypto_chart',
                name: 'Market Comparison Chart',
                component: CryptoChartWidget,
                params: [
                    {
                        id: 'coins',
                        label: 'Cryptocurrencies',
                        type: 'coin-multiselect',
                        placeholder: 'CoinGecko ID, e.g. dogecoin',
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
                        label: 'Currency',
                        type: 'select',
                        placeholder: 'Select a currency',
                        options: [
                            { value: 'eur', label: 'EUR (€)' },
                            { value: 'usd', label: 'USD ($)' },
                            { value: 'gbp', label: 'GBP (£)' },
                        ],
                    },
                    {
                        id: 'days',
                        label: 'Period',
                        type: 'select',
                        placeholder: 'Select a period',
                        options: [
                            { value: '7', label: '1 week' },
                            { value: '30', label: '1 month' },
                            { value: '90', label: '3 months' },
                            { value: '365', label: '1 year' },
                        ],
                    },
                ],
            },
        ],
    },
    stocks: {
        name: 'Stock Market',
        hasRefresh: true,
        periodParam: 'period',
        quotaLimited: true,
        widgets: [
            {
                id: 'stock_market',
                name: 'Stock Comparison Chart',
                component: StockMarketWidget,
                params: [
                    {
                        id: 'symbols',
                        label: 'Companies',
                        type: 'stock-multiselect',
                        placeholder: 'Search by company or ticker',
                        options: [
                            { value: 'AAPL', label: 'Apple' },
                            { value: 'NVDA', label: 'NVIDIA' },
                            { value: 'MSFT', label: 'Microsoft' },
                            { value: 'TSLA', label: 'Tesla' },
                        ],
                    },
                    {
                        id: 'period',
                        label: 'Period',
                        type: 'segmented',
                        defaultValue: '1M',
                        placeholder: 'Select a period',
                        options: [
                            { value: '1W', label: '1 week' },
                            { value: '1M', label: '1 month' },
                            { value: '1Y', label: '1 year' },
                            { value: '5Y', label: '5 years' },
                            { value: 'ALL', label: 'All available history' },
                        ],
                    },
                ],
            },
            {
                id: 'stock_profile',
                name: 'Stock Profile',
                component: StockProfileWidget,
                params: [
                    {
                        id: 'symbols',
                        label: 'Company',
                        type: 'stock-select',
                        placeholder: 'Search by company or ticker',
                        options: [
                            { value: 'AAPL', label: 'Apple' },
                            { value: 'NVDA', label: 'NVIDIA' },
                            { value: 'MSFT', label: 'Microsoft' },
                            { value: 'TSLA', label: 'Tesla' },
                        ],
                    },
                    {
                        id: 'period',
                        label: 'Period',
                        type: 'segmented',
                        defaultValue: '1M',
                        placeholder: 'Select a period',
                        options: [
                            { value: '1W', label: '1 week' },
                            { value: '1M', label: '1 month' },
                            { value: '1Y', label: '1 year' },
                            { value: '5Y', label: '5 years' },
                            { value: 'ALL', label: 'All available history' },
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
                name: 'Ollama Chat',
                component: ChatbotWidget,
                customConfigUi: OllamaModelManager,
                params: [
                    {
                        id: 'model',
                        label: 'Ollama Model',
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
