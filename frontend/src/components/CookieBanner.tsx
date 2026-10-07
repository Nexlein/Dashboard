import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CookieBanner() {
    const { t } = useTranslation('common');
    const [isVisible, setIsVisible] = useState(() => !localStorage.getItem('cookie-consent'));

    if (!isVisible) return null;

    const accept = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setIsVisible(false);
    };

    const decline = () => {
        localStorage.setItem('cookie-consent', 'declined');
        setIsVisible(false);
    };

    return (
        <section
            aria-label={t('cookieConsent')}
            className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg"
        >
            <div className="text-sm text-muted-foreground flex-1">
                {t('cookieNotice')}{' '}
                <a href="/privacy" className="underline ml-1 hover:text-foreground">
                    {t('readPrivacy')}
                </a>
                .
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={decline}>
                    {t('decline')}
                </Button>
                <Button onClick={accept}>{t('accept')}</Button>
            </div>
        </section>
    );
}
