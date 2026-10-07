// Fixed data, not real accounts or provider credentials. Keep this scenario stable
// so score changes reflect the application rather than changing market data.
const prices = Array.from({ length: 24 }, (_, index) => ({
    timestamp: 1700000000000 + index * 3600000,
    price: 100 + index / 2 + Math.sin(index) * 2,
}));

export const widgets = [
    {
        serviceName: 'crypto',
        widgetName: 'crypto_chart',
        params: { coins: 'bitcoin,ethereum', currency: 'eur', days: '7' },
        layout: { x: 0, y: 0, w: 6, h: 5 },
    },
    {
        serviceName: 'chatbot',
        widgetName: 'ai_chat',
        params: { model: 'llama3' },
        layout: { x: 6, y: 0, w: 6, h: 5 },
    },
    {
        serviceName: 'youtube',
        widgetName: 'video_player',
        params: { video_url: 'https://youtu.be/M7lc1UVf-VE' },
        layout: { x: 0, y: 5, w: 3, h: 4 },
    },
    {
        serviceName: 'youtube',
        widgetName: 'channel_watch',
        params: { channels: '@alpha' },
        layout: { x: 3, y: 5, w: 3, h: 4 },
    },
    {
        serviceName: 'stocks',
        widgetName: 'stock_market',
        params: { symbols: 'AAPL,NVDA', period: '1M' },
        layout: { x: 6, y: 5, w: 6, h: 5 },
    },
].map((widget, index) => ({ ...widget, id: index + 1, refreshRate: 600 }));

export const responses = {
    '/api/auth/get-session': {
        user: { id: '42', name: 'Ada', email: 'ada@example.com', role: 'user' },
        session: { id: 'lighthouse-fixture', userId: '42' },
    },
    '/widgets': widgets,
    '/widgets/1/data': {
        currency: 'eur',
        days: 7,
        historyLimited: false,
        series: [
            { coin: 'bitcoin', symbol: 'BTC', change: -2.5 },
            { coin: 'ethereum', symbol: 'ETH', change: 1.5 },
        ].map((coin) => ({ ...coin, image: null, currentPrice: 110, prices })),
    },
    '/widgets/4/data': {
        channels: [{ id: 'alpha', title: 'Alpha', checkedAt: '2026-10-07T10:00:00Z' }],
        videos: [],
        warnings: [],
    },
    '/widgets/5/data': {
        period: '1M',
        series: [
            { symbol: 'AAPL', name: 'Apple', change: 1.5 },
            { symbol: 'NVDA', name: 'NVIDIA', change: -2.5 },
        ].map((stock) => ({
            ...stock,
            currency: 'USD',
            exchange: 'NASDAQ',
            logo: null,
            currentPrice: 110,
            prices,
        })),
    },
    '/services': [],
};
