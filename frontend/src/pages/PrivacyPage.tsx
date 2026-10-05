import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
    const navigate = useNavigate();

    return (
        <main className="min-h-screen bg-background text-foreground p-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div className="max-w-4xl mx-auto space-y-8">
                <Card>
                    <CardHeader>
                        <h1 className="text-3xl font-bold leading-none tracking-tight">
                            Privacy Policy (RGPD / GDPR)
                        </h1>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none space-y-6">
                        <section>
                            <h2 className="text-2xl font-semibold mb-2">Data Storage</h2>
                            <p>We store the following user data:</p>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                                <li>Email address (for authentication and account recovery)</li>
                                <li>Password hashes (if not using OAuth)</li>
                                <li>Encrypted OAuth tokens (for connected services like GitHub)</li>
                                <li>Widget configurations (parameters and layouts)</li>
                                <li>Linked GitHub account ID (to preserve your login)</li>
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
                                Profile and registration
                            </h2>
                            <p>
                                You can edit your display name and email, including with a
                                GitHub-only account. Your GitHub account ID keeps your login linked
                                to the same Dashboard account after an email change.
                            </p>
                            <p>
                                New accounts require accepting the terms and confirming that you are
                                at least 16, including when signing up with GitHub. This is a
                                self-declaration; we do not collect or verify your birth date.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-2">
                                Your Rights (GDPR Compliance)
                            </h2>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                                <li>
                                    <strong>Right to Access</strong>: "Download My Data" exports
                                    your profile, readable widget configurations and
                                    connected-service metadata. Password hashes, API keys and OAuth
                                    tokens are excluded.
                                </li>
                                <li>
                                    <strong>Right to Erasure</strong>: You can permanently delete
                                    your account, widgets and stored service credentials from the
                                    active database via "Delete My Account". This does not delete
                                    data held by external providers or retained backups.
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
        </main>
    );
}
