import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { useState, type ComponentType, type SVGProps } from 'react';
import { Github } from '@/components/ui/Github';

// Every logo is served by the app itself: loading them from the brands' sites would send
// each visitor's IP address to those third parties.
const SERVICE_BRANDS: Record<
    string,
    { name: string; logo?: string; icon?: ComponentType<SVGProps<SVGSVGElement>> }
> = {
    weather: { name: 'OpenWeather', logo: '/logos/openweather.svg' },
    github: { name: 'GitHub', icon: Github },
    youtube: { name: 'YouTube', logo: '/logos/youtube.svg' },
    crypto: { name: 'CoinGecko', logo: '/logos/coingecko.svg' },
    stocks: { name: 'Twelve Data', logo: '/logos/twelve-data.png' },
    chatbot: { name: 'Ollama', logo: '/logos/ollama.png' },
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
    useTranslation();
    const [failed, setFailed] = useState(false);
    const brand = SERVICE_BRANDS[name];
    const label = displayName || brand?.name || name;
    const logo = brand?.logo;
    const Icon = brand?.icon;

    return (
        <span
            aria-hidden={decorative || undefined}
            className={`flex shrink-0 items-center justify-center overflow-hidden border bg-white text-slate-700 shadow-sm ${
                size === 'sm' ? 'size-6 rounded-md p-0.5' : 'size-11 rounded-xl p-2'
            }`}
        >
            {logo && !failed ? (
                <img
                    src={logo}
                    alt={decorative ? '' : i18n.t('services:logo', { name: label })}
                    className="size-full object-contain"
                    draggable={false}
                    onError={() => setFailed(true)}
                />
            ) : Icon ? (
                <Icon
                    className="size-full"
                    role={decorative ? undefined : 'img'}
                    aria-label={decorative ? undefined : i18n.t('services:logo', { name: label })}
                    aria-hidden={decorative || undefined}
                />
            ) : (
                <span
                    className={`font-bold ${size === 'sm' ? 'text-[9px]' : 'text-sm'}`}
                    aria-hidden="true"
                >
                    {label.slice(0, 2).toUpperCase()}
                </span>
            )}
        </span>
    );
}
