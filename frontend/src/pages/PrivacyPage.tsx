import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
    useTranslation();
    const navigate = useNavigate();

    return (
        <main className="min-h-screen bg-background text-foreground p-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {i18n.t('common:back')}
            </Button>
            <div className="max-w-4xl mx-auto space-y-8">
                <Card>
                    <CardHeader>
                        <h1 className="text-3xl font-bold leading-none tracking-tight">
                            {i18n.t('legal:privacyTitle')}
                        </h1>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none space-y-6">
                        <section>
                            <h2 className="text-2xl font-semibold mb-2">
                                {i18n.t('legal:storage')}
                            </h2>
                            <p>{i18n.t('legal:storageIntro')}</p>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                                <li>{i18n.t('legal:storedEmail')}</li>
                                <li>{i18n.t('legal:storedPassword')}</li>
                                <li>{i18n.t('legal:storedTokens')}</li>
                                <li>{i18n.t('legal:storedWidgets')}</li>
                                <li>{i18n.t('legal:storedGithub')}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-2">{i18n.t('legal:usage')}</h2>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                                <li>{i18n.t('legal:usageDashboard')}</li>
                                <li>{i18n.t('legal:usageTokens')}</li>
                                <li>{i18n.t('legal:noSale')}</li>
                                <li>{i18n.t('legal:youtubePrivacy')}</li>
                                <li>{i18n.t('legal:adminPrivacy')}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-2">
                                {i18n.t('legal:profileRegistration')}
                            </h2>
                            <p>{i18n.t('legal:profilePolicy')}</p>
                            <p>{i18n.t('legal:registrationPolicy')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-2">
                                {i18n.t('legal:rights')}
                            </h2>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                                <li>
                                    <strong>{i18n.t('legal:access')}</strong>
                                    {i18n.t('legal:accessDetails')}
                                </li>
                                <li>
                                    <strong>{i18n.t('legal:erasure')}</strong>
                                    {i18n.t('legal:erasureDetails')}
                                </li>
                                <li>
                                    <strong>{i18n.t('legal:consent')}</strong>
                                    {i18n.t('legal:consentDetails')}
                                </li>
                            </ul>
                        </section>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
