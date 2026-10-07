import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
    const { t } = useTranslation(['common', 'legal']);
    const navigate = useNavigate();

    return (
        <main className="min-h-screen bg-background text-foreground p-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common:back')}
            </Button>
            <div className="max-w-4xl mx-auto space-y-8">
                <Card>
                    <CardHeader>
                        <h1 className="text-3xl font-bold leading-none tracking-tight">
                            {t('legal:privacyTitle')}
                        </h1>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none space-y-6">
                        <section>
                            <h2 className="text-2xl font-semibold mb-2">{t('legal:storage')}</h2>
                            <p>{t('legal:storageIntro')}</p>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                                <li>{t('legal:storedEmail')}</li>
                                <li>{t('legal:storedPassword')}</li>
                                <li>{t('legal:storedTokens')}</li>
                                <li>{t('legal:storedWidgets')}</li>
                                <li>{t('legal:storedGithub')}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-2">{t('legal:usage')}</h2>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                                <li>{t('legal:usageDashboard')}</li>
                                <li>{t('legal:usageTokens')}</li>
                                <li>{t('legal:noSale')}</li>
                                <li>{t('legal:youtubePrivacy')}</li>
                                <li>{t('legal:adminPrivacy')}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-2">
                                {t('legal:profileRegistration')}
                            </h2>
                            <p>{t('legal:profilePolicy')}</p>
                            <p>{t('legal:registrationPolicy')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-2">{t('legal:rights')}</h2>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                                <li>
                                    <strong>{t('legal:access')}</strong>
                                    {t('legal:accessDetails')}
                                </li>
                                <li>
                                    <strong>{t('legal:erasure')}</strong>
                                    {t('legal:erasureDetails')}
                                </li>
                                <li>
                                    <strong>{t('legal:consent')}</strong>
                                    {t('legal:consentDetails')}
                                </li>
                            </ul>
                        </section>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
