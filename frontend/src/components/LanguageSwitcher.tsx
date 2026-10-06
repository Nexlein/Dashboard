import { useTranslation } from 'react-i18next';
import { useId } from 'react';
import { Languages } from 'lucide-react';
import { changeLanguage } from '@/i18n';
import { FALLBACK_LANGUAGE, normalizeLanguage } from '@/i18n/language';

/** Available on public and signed-in pages; language names use their own language. */
export function LanguageSwitcher() {
    const { t, i18n } = useTranslation();
    const id = useId();
    return (
        <div className="flex items-center gap-2 text-sm text-foreground">
            <Languages aria-hidden="true" className="size-4 text-muted-foreground" />
            <label htmlFor={id}>{t('language.label')}</label>
            <select
                id={id}
                value={normalizeLanguage(i18n.resolvedLanguage) ?? FALLBACK_LANGUAGE}
                onChange={(event) => {
                    const language = normalizeLanguage(event.target.value);
                    if (language) void changeLanguage(language);
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
                <option value="fr" lang="fr">
                    {t('language.french')}
                </option>
                <option value="en" lang="en">
                    {t('language.english')}
                </option>
            </select>
        </div>
    );
}
