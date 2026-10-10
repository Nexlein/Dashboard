import { useId } from 'react';
import { Accessibility } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    TEXT_SIZES,
    resetAccessibility,
    setAccessibility,
    useAccessibility,
    type AccessibilitySettings,
    type MotionPreference,
} from '@/lib/accessibility';

type Toggle = 'highContrast' | 'underlineLinks' | 'textSpacing' | 'readableFont';

const TOGGLES: {
    key: Toggle;
    help?: 'highContrastHelp' | 'textSpacingHelp' | 'readableFontHelp';
}[] = [
    { key: 'highContrast', help: 'highContrastHelp' },
    { key: 'underlineLinks' },
    { key: 'textSpacing', help: 'textSpacingHelp' },
    { key: 'readableFont', help: 'readableFontHelp' },
];

const MOTIONS: {
    value: MotionPreference;
    label: 'motionSystem' | 'motionReduce' | 'motionAllow';
}[] = [
    { value: 'system', label: 'motionSystem' },
    { value: 'reduce', label: 'motionReduce' },
    { value: 'allow', label: 'motionAllow' },
];

const choice =
    'flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring';

/** Accessibility settings (text size, contrast, motion…), on public and signed-in pages. */
export function AccessibilityMenu() {
    const { t } = useTranslation('common', { keyPrefix: 'accessibility' });
    const settings = useAccessibility();
    const id = useId();

    const toggle = (key: Toggle) =>
        setAccessibility({ [key]: !settings[key] } as Partial<AccessibilitySettings>);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0 rounded-full"
                    aria-label={t('open')}
                    title={t('open')}
                >
                    <Accessibility aria-hidden="true" className="size-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>{t('description')}</DialogDescription>
                </DialogHeader>

                <fieldset className="grid gap-2">
                    <legend className="mb-2 text-sm font-medium">{t('textSize')}</legend>
                    <div className="grid grid-cols-4 gap-2">
                        {TEXT_SIZES.map((size) => (
                            <label key={size} className={choice}>
                                <input
                                    type="radio"
                                    name={`${id}-text-size`}
                                    className="sr-only"
                                    checked={settings.textSize === size}
                                    onChange={() => setAccessibility({ textSize: size })}
                                />
                                {size}%
                            </label>
                        ))}
                    </div>
                </fieldset>

                <fieldset className="grid gap-2">
                    <legend className="mb-2 text-sm font-medium">{t('motion')}</legend>
                    <div className="grid grid-cols-3 gap-2">
                        {MOTIONS.map(({ value, label }) => (
                            <label key={value} className={choice}>
                                <input
                                    type="radio"
                                    name={`${id}-motion`}
                                    className="sr-only"
                                    checked={settings.motion === value}
                                    onChange={() => setAccessibility({ motion: value })}
                                />
                                {t(label)}
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div className="grid gap-3">
                    {TOGGLES.map(({ key, help }) => (
                        <div key={key} className="grid gap-0.5">
                            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
                                <input
                                    type="checkbox"
                                    className="size-5 shrink-0 accent-primary"
                                    checked={settings[key]}
                                    onChange={() => toggle(key)}
                                    aria-describedby={help ? `${id}-${key}-help` : undefined}
                                />
                                {t(key)}
                            </label>
                            {help && (
                                <p
                                    id={`${id}-${key}-help`}
                                    className="pl-8 text-xs text-muted-foreground"
                                >
                                    {t(help)}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={resetAccessibility}>
                        {t('reset')}
                    </Button>
                    <DialogClose asChild>
                        <Button type="button">{t('done')}</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
