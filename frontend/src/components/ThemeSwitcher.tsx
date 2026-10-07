import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/lib/theme';

export function ThemeSwitcher() {
    const { t } = useTranslation();
    const { theme, setTheme } = useTheme();

    return (
        <div
            role="group"
            aria-label={t('theme')}
            className="relative inline-flex h-11 shrink-0 items-center gap-1 rounded-full border border-input bg-background p-1"
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-1 top-1 size-8.5 rounded-full bg-accent ring-1 ring-border transition-transform duration-200 ease-out motion-reduce:transition-none ${
                    theme === 'dark' ? 'translate-x-9.5' : 'translate-x-0'
                }`}
            />
            {(['light', 'dark'] as const).map((choice) => {
                const Icon = choice === 'light' ? Sun : Moon;
                const label = t(choice === 'light' ? 'lightTheme' : 'darkTheme');
                return (
                    <button
                        key={choice}
                        type="button"
                        aria-label={label}
                        aria-pressed={choice === (theme === 'dark' ? 'dark' : 'light')}
                        title={label}
                        onClick={() => setTheme(choice)}
                        className="relative flex size-8.5 cursor-pointer items-center justify-center rounded-full text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                        <Icon aria-hidden="true" className="size-4" />
                    </button>
                );
            })}
        </div>
    );
}
