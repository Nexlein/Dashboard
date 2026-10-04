import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CookieBanner() {
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
            aria-label="Cookie consent"
            className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg"
        >
            <div className="text-sm text-muted-foreground flex-1">
                We use strictly necessary cookies/local storage for authentication and preferences.
                By clicking "Accept", you consent to our use of these technologies.
                <a href="/privacy" className="underline ml-1 hover:text-foreground">
                    Read our Privacy Policy
                </a>
                .
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={decline}>
                    Decline
                </Button>
                <Button onClick={accept}>Accept</Button>
            </div>
        </section>
    );
}
