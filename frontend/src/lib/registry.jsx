import { CurrentWeather, Forecast } from '@/components/widgets/WeatherWidgets';
import {
    GithubRepoWidget,
    GithubProfileWidget,
    GithubCommitsWidget,
} from '@/components/widgets/GithubWidgets';
import { CryptoPrice } from '@/components/widgets/CryptoPrice';
import { CryptoChartWidget } from '@/components/widgets/CryptoChartWidget';
import { ChatbotWidget } from '@/components/widgets/ChatbotWidget';
import { OllamaModelManager } from '@/components/OllamaModelManager';

export const REGISTRY = {
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
                        id: 'username',
                        label: 'GitHub Username (leave empty for your profile)',
                        type: 'text',
                        placeholder: 'e.g. nexlein',
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
