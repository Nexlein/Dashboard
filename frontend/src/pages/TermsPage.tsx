import { ArrowLeft, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const sections = [
    {
        title: '1. Objet du service',
        content:
            'Dashboard permet de regrouper et d’organiser des widgets connectés à différents services. Ces conditions définissent les règles d’utilisation de la plateforme.',
    },
    {
        title: '2. Création du compte',
        content:
            'Vous devez fournir une adresse e-mail valide et protéger votre mot de passe. Le nom d’affichage est facultatif. Vous êtes responsable des actions réalisées depuis votre compte.',
    },
    {
        title: '3. Utilisation acceptable',
        content:
            'Vous vous engagez à ne pas détourner le service, tenter d’accéder aux comptes d’autres utilisateurs, perturber la plateforme ou utiliser les intégrations d’une manière contraire à leurs propres conditions.',
    },
    {
        title: '4. Données et confidentialité',
        content:
            'Les informations nécessaires au compte, aux préférences et aux widgets sont enregistrées afin de fournir le service. Les mots de passe sont stockés sous forme chiffrée par hachage et ne sont jamais conservés en clair.',
    },
    {
        title: '5. Services externes',
        content:
            'Certaines fonctionnalités reposent sur des services tiers. Leur disponibilité et le traitement des données qu’ils réalisent dépendent également de leurs propres règles et politiques.',
    },
    {
        title: '6. Disponibilité et responsabilité',
        content:
            'La plateforme peut évoluer, être interrompue pour maintenance ou rencontrer des indisponibilités. Aucun fonctionnement permanent ou sans erreur ne peut être garanti.',
    },
    {
        title: '7. Suppression du compte',
        content:
            'Vous pouvez demander la suppression de votre compte et des données qui lui sont associées. Les modalités de contact et d’exercice de ce droit seront précisées dans la politique de confidentialité.',
    },
    {
        title: '8. Évolution des conditions',
        content:
            'Ces conditions peuvent être mises à jour lorsque le service évolue. En cas de modification importante, une information claire sera présentée aux utilisateurs.',
    },
];

export default function TermsPage() {
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
                        Retour à l’inscription
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
                <section className="mb-8 max-w-3xl sm:mb-10">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
                        <ShieldCheck className="size-4" />
                        Conditions d’utilisation
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                        Conditions générales d’utilisation
                    </h1>
                    <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                        Ces conditions expliquent simplement les règles applicables lorsque vous
                        créez un compte et utilisez Dashboard.
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                        Dernière mise à jour : 17 septembre 2026
                    </p>
                </section>

                <Card className="shadow-xs">
                    <CardContent className="divide-y p-5 sm:p-8">
                        <section className="pb-7">
                            <h2 className="text-xl font-semibold">Acceptation</h2>
                            <p className="mt-3 leading-7 text-muted-foreground">
                                En cochant la case lors de l’inscription, vous confirmez avoir lu et
                                accepté les présentes conditions. Si vous ne les acceptez pas, vous
                                ne devez pas créer de compte.
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
                        <p className="font-medium">Vous avez terminé votre lecture ?</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Revenez à l’inscription pour créer votre compte.
                        </p>
                    </div>
                    <Link to="/register" className={buttonVariants()}>
                        Retour à l’inscription
                    </Link>
                </div>
            </div>
        </main>
    );
}
