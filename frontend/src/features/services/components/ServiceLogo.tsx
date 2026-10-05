import { useState } from 'react';

const SERVICE_BRANDS: Record<string, { name: string; logo?: string }> = {
    weather: { name: 'OpenWeather', logo: '/logos/openweather.svg' },
    github: { name: 'GitHub', logo: 'https://github.githubassets.com/favicons/favicon.svg' },
    crypto: { name: 'CoinGecko', logo: 'https://www.coingecko.com/favicon.ico' },
    stocks: { name: 'Twelve Data', logo: '/logos/twelve-data.png' },
    chatbot: { name: 'Ollama', logo: 'https://ollama.com/public/ollama.png' },
};

export function ServiceLogo({
    name,
    displayName,
    size = 'md',
    decorative = false,
}: {
    name: string;
    displayName?: string;
    size?: 'sm' | 'md';
    decorative?: boolean;
}) {
    const [failed, setFailed] = useState(false);
    const brand = SERVICE_BRANDS[name];
    const label = displayName || brand?.name || name;
    const logo = brand?.logo;

    return (
        <span
            aria-hidden={decorative || undefined}
            className={`flex shrink-0 items-center justify-center overflow-hidden border bg-white shadow-sm ${
                size === 'sm' ? 'size-6 rounded-md p-0.5' : 'size-11 rounded-xl p-2'
            }`}
        >
            {logo && !failed ? (
                <img
                    src={logo}
                    alt={decorative ? '' : `${label} logo`}
                    className="size-full object-contain"
                    draggable={false}
                    onError={() => setFailed(true)}
                />
            ) : (
                <span
                    className={`font-bold text-slate-700 ${size === 'sm' ? 'text-[9px]' : 'text-sm'}`}
                    aria-hidden="true"
                >
                    {label.slice(0, 2).toUpperCase()}
                </span>
            )}
        </span>
    );
}
