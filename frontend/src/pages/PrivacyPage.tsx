import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-foreground p-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div className="max-w-4xl mx-auto space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">
                            Privacy Policy (RGPD / GDPR)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none space-y-6">
                        <section>
                            <h2 className="text-2xl font-semibold mb-2">Data Storage</h2>
                            <p>We store the following user data:</p>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                                <li>Email address (for authentication and account recovery)</li>
                                <li>Encrypted passwords (if not using OAuth)</li>
                                <li>OAuth tokens (for connected services like GitHub)</li>
                                <li>Widget configurations (parameters and layouts)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-2">Data Usage</h2>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                                <li>
                                    User data is used strictly to provide the dashboard features and
                                    widget functionalities.
                                </li>
                                <li>
                                    OAuth tokens are used solely to fetch data for the connected
                                    services as configured by the user.
                                </li>
                                <li>We do not sell or share your data with third parties.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-2">
                                Your Rights (GDPR Compliance)
                            </h2>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                                <li>
                                    <strong>Right to Access</strong>: You can download all your data
                                    stored on our platform via the "Download My Data" button in your
                                    account settings.
                                </li>
                                <li>
                                    <strong>Right to Erasure</strong>: You can permanently delete
                                    your account and all associated data via the "Delete My Account"
                                    button.
                                </li>
                                <li>
                                    <strong>Consent</strong>: By registering, you accept our Terms
                                    of Service (CGU) and this Privacy Policy.
                                </li>
                            </ul>
                        </section>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
