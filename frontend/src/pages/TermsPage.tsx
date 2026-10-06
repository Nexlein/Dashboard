import { formatDate } from '@/i18n/format';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const sections = [
    {
        get title() {
            return i18n.t('legal:purposeTitle');
        },
        get content() {
            return i18n.t('legal:purpose');
        },
    },
    {
        get title() {
            return i18n.t('legal:accountTitle');
        },
        get content() {
            return i18n.t('legal:account');
        },
    },
    {
        get title() {
            return i18n.t('legal:acceptableTitle');
        },
        get content() {
            return i18n.t('legal:acceptable');
        },
    },
    {
        get title() {
            return i18n.t('legal:dataTitle');
        },
        get content() {
            return i18n.t('legal:data');
        },
    },
    {
        get title() {
            return i18n.t('legal:externalTitle');
        },
        get content() {
            return i18n.t('legal:external');
        },
    },
    {
        get title() {
            return i18n.t('legal:availabilityTitle');
        },
        get content() {
            return i18n.t('legal:availability');
        },
    },
    {
        get title() {
            return i18n.t('legal:deletionTitle');
        },
        get content() {
            return i18n.t('legal:deletion');
        },
    },
    {
        get title() {
            return i18n.t('legal:changesTitle');
        },
        get content() {
            return i18n.t('legal:changes');
        },
    },
];

export default function TermsPage() {
    useTranslation();
    return (
        <main className="min-h-screen bg-muted/40 text-foreground">
            <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
                    <Link to="/register" className="flex items-center gap-2 font-semibold">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <LayoutDashboard className="size-4" />
                        </span>
                        Dashboard
                    </Link>
                    <Link to="/register" className={buttonVariants({ variant: 'ghost' })}>
                        <ArrowLeft />
                        {i18n.t('legal:backRegistration')}
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
                <section className="mb-8 max-w-3xl sm:mb-10">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
                        <ShieldCheck className="size-4" />
                        {i18n.t('legal:termsBadge')}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                        {i18n.t('legal:termsTitle')}
                    </h1>
                    <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                        {i18n.t('legal:termsIntro')}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                        {i18n.t('legal:lastUpdated', {
                            date: formatDate(new Date('2026-09-17T12:00:00'), {
                                dateStyle: 'long',
                            }),
                        })}
                    </p>
                </section>

                <Card className="shadow-xs">
                    <CardContent className="divide-y p-5 sm:p-8">
                        <section className="pb-7">
                            <h2 className="text-xl font-semibold">{i18n.t('legal:acceptance')}</h2>
                            <p className="mt-3 leading-7 text-muted-foreground">
                                {i18n.t('legal:acceptanceDetails')}
                            </p>
                        </section>

                        {sections.map((section) => (
                            <section key={section.title} className="py-7 last:pb-0">
                                <h2 className="text-lg font-semibold sm:text-xl">
                                    {section.title}
                                </h2>
                                <p className="mt-3 leading-7 text-muted-foreground">
                                    {section.content}
                                </p>
                            </section>
                        ))}
                    </CardContent>
                </Card>

                <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-xl border bg-background p-5 sm:flex-row sm:items-center">
                    <div>
                        <p className="font-medium">{i18n.t('legal:finished')}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {i18n.t('legal:returnRegistration')}
                        </p>
                    </div>
                    <Link to="/register" className={buttonVariants()}>
                        {i18n.t('legal:backRegistration')}
                    </Link>
                </div>
            </div>
        </main>
    );
}
