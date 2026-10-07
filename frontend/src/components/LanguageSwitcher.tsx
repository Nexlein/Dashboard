import { Menu } from '@base-ui/react/menu';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/i18n';
import { FALLBACK_LANGUAGE, normalizeLanguage } from '@/i18n/language';

/** Compact language choice available on public and signed-in pages. */
export function LanguageSwitcher({ inMenu = false }: { inMenu?: boolean }) {
    const { t, i18n } = useTranslation();
    const selectedLanguage = normalizeLanguage(i18n.resolvedLanguage) ?? FALLBACK_LANGUAGE;

    const switchContent = (
        <div
            role={inMenu ? undefined : 'group'}
            aria-label={inMenu ? undefined : t('language.label')}
            className={
                inMenu
                    ? 'relative inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-input bg-muted/50 p-0.5'
                    : 'relative inline-flex shrink-0 items-center gap-1 rounded-full border border-input bg-background p-1'
            }
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none absolute bg-accent ring-1 ring-border transition-transform duration-200 ease-out motion-reduce:transition-none ${
                    inMenu
                        ? 'left-0.5 top-0.5 h-7 w-9 rounded-md'
                        : 'left-1 top-1 size-10 rounded-full'
                } ${selectedLanguage === 'en' ? (inMenu ? 'translate-x-9.5' : 'translate-x-11') : 'translate-x-0'}`}
            />
            {(['fr', 'en'] as const).map((language) => {
                const label = t(language === 'fr' ? 'language.french' : 'language.english');
                const flag = (
                    <img
                        src={`/flags/${language}.svg`}
                        alt=""
                        aria-hidden="true"
                        width={inMenu ? 18 : 24}
                        height={inMenu ? 12 : 16}
                        className={`${inMenu ? 'h-3 w-[18px]' : 'h-4 w-6'} rounded-[2px] ring-1 ring-black/10`}
                    />
                );
                const className = `relative flex cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${inMenu ? 'h-7 w-9 rounded-md' : 'size-10 rounded-full'}`;
                return inMenu ? (
                    <Menu.RadioItem
                        key={language}
                        value={language}
                        closeOnClick={false}
                        aria-label={label}
                        title={label}
                        className={className}
                    >
                        {flag}
                    </Menu.RadioItem>
                ) : (
                    <button
                        key={language}
                        type="button"
                        aria-label={label}
                        aria-pressed={selectedLanguage === language}
                        title={label}
                        onClick={() => void changeLanguage(language)}
                        className={className}
                    >
                        {flag}
                    </button>
                );
            })}
        </div>
    );

    return inMenu ? (
        <Menu.RadioGroup
            aria-label={t('language.label')}
            value={selectedLanguage}
            onValueChange={(value) => {
                const language = normalizeLanguage(value);
                if (language) void changeLanguage(language);
            }}
        >
            {switchContent}
        </Menu.RadioGroup>
    ) : (
        switchContent
    );
}
