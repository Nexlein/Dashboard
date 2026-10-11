# Internationalisation FR / EN

## Interface migrée

Les ressources de `frontend/src/i18n/locales/en` et `fr` couvrent les routes publiques et authentifiées, les dialogues, le catalogue, les widgets et leurs attributs accessibles.

| Domaine                                   | Couverture                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `common`                                  | Navigation, langue, thème, actions, export/suppression, cookies, erreurs de rendu |
| `auth`                                    | Connexion, inscription, OAuth, codes, mot de passe oublié, décor                  |
| `account`                                 | Profil, changement d’adresse e-mail et confirmations                              |
| `services`                                | Connexions, comptes OAuth, clés, descriptions et états                            |
| `widgets`                                 | Catalogue, paramètres, configuration, titres, chargements, rechargements          |
| `markets`                                 | Cryptomonnaies, actions, statistiques, périodes et graphiques                     |
| `weather`, `github`, `youtube`, `chatbot` | Libellés, conditions météo, actions et états des widgets                          |
| `admin`                                   | Filtres, comptes, pluriels, dates, actions et confirmations                       |
| `legal`                                   | CGU et politique de confidentialité complètes                                     |
| `errors`                                  | Messages correspondant aux codes API, à la validation et aux erreurs Better Auth  |

Les libellés des constantes de catalogue et les titres sont résolus dans la langue courante. Le changement de langue recalcule la présentation du catalogue sans recharger `/about.json`. Il conserve les identifiants, paramètres, périodes, configurations enregistrées, saisies et conversations.

`format.ts` applique la langue choisie aux dates et nombres. Les valeurs de périodes transmises à l’API (`1W`, `5Y`, `ALL`, etc.), les unités et les devises restent inchangées ; seuls leurs libellés et formats d’affichage changent.

## Initialisation et sélection

`i18n/index.ts` initialise i18next avant le premier rendu, avec les ressources embarquées et `initReactI18next`. Le provider est installé dans `main.tsx`. Les traductions ne nécessitent aucune requête réseau.

La priorité est : choix enregistré dans `dashboard-language`, première langue supportée du navigateur, puis anglais. Les variantes comme `fr-FR`, `fr-CA` et `en-US` sont ramenées à `fr` ou `en`. Seul un choix explicite est mémorisé. Un stockage indisponible n’empêche pas le sélecteur de changer la langue pendant la visite.

Le sélecteur est présent dans la navigation authentifiée et sur les pages publiques. Il utilise les noms natifs des langues, un label accessible et un contrôle natif utilisable au clavier. `html.lang` est synchronisé à l’initialisation et à chaque changement.

## Messages API et contenus externes

Les erreurs des routes API ajoutent `code` tout en conservant `error` pour les consommateurs existants. `shared/src/apiErrors.ts` définit une union de codes partagée entre le backend et le frontend. `HttpError` et `apiError` exigent un code explicite à la création de chaque erreur : modifier le texte anglais ne change pas la traduction. Les validations Zod portent leur code dans les paramètres de leur vérification personnalisée ; les erreurs de structure utilisent `VALIDATION_ERROR`. Les catalogues de traduction doivent couvrir tous les codes, ce que TypeScript vérifie. Les erreurs Better Auth sont lues par leur code, avec quelques alias documentés dans `i18n/errors.ts`.

Le frontend garde l’objet d’erreur ou la clé de notification jusqu’au rendu. Ainsi, un message d’erreur ou de succès déjà affiché suit le changement de langue. Les codes inconnus et diagnostics de fournisseurs utilisent un message générique traduit ; l’interface ne compare pas des phrases anglaises pour décider d’une action. Les métadonnées de rechargement (`Retry-After`, statut) sont préservées.

Les états des services sont reconstruits à partir de données structurées (`accounts`, `verifiedAt`, `keyHint`), sans afficher les phrases déjà formatées par le serveur. Les avertissements YouTube exposent aussi un code. La météo fournit `conditionCode` : les conditions et textes alternatifs sont traduits selon les identifiants [OpenWeather](https://openweathermap.org/api/weather-conditions). Pour les anciennes réponses en cache sans code, l’icône donne un repli descriptif traduit.

Les noms, publications, descriptions et biographies GitHub/YouTube, entreprises, modèles Ollama et messages saisis ou générés sont conservés dans leur langue d’origine. Seuls le message d’accueil et les messages d’état générés par l’application dans le chatbot sont traduits.

La localisation des emails envoyés par le backend et des contrôles internes du lecteur YouTube intégré reste hors de cette migration de l’interface React. Les logs, Swagger et diagnostics d’exploitation ne sont pas des textes d’interface.

## Conventions

1. Ajouter les traductions dans les deux fichiers JSON du domaine et enregistrer tout nouveau domaine dans `resources.ts`.
2. Utiliser des clés sémantiques (`auth:login`), typées à partir des ressources anglaises. Utiliser `const { t } = useTranslation('widgets')` dans les composants et `t('configure', { name })` pour leurs textes. Les helpers hors composant utilisent l’instance `i18n` ; leur composant appelant doit rester abonné aux changements de langue.
3. Écrire les phrases entières avec interpolation (`{{name}}`, `{{count}}`). Utiliser les pluriels i18next et `Trans` avec un namespace explicite pour les phrases contenant des liens.
4. Employer `changeLanguage` exporté par `@/i18n` pour mémoriser une sélection explicite. Ne pas stocker une traduction résolue dans une constante de module ou dans l’état d’un formulaire.
5. Préférer « tableau de bord », « widget », « compte », « service », « adresse e-mail », « bannissement » et « actualiser » en français ; conserver les marques et noms personnels.

## Ajouter une langue

Les fichiers JSON actuels sont le catalogue à traduire. Un inventaire de l’ancien code avec des numéros de ligne devient obsolète et n’est pas nécessaire pour cette extension.

1. Copier tous les domaines de `frontend/src/i18n/locales/en/` vers un nouveau dossier, par exemple `es/`, et traduire les valeurs en conservant les clés, interpolations et balises. Adapter les formes plurielles aux règles de la langue.
2. Importer les domaines dans `resources.ts` et ajouter la langue à `resources`, puis à `SUPPORTED_LANGUAGES` dans `language.ts`. Conserver l’anglais comme langue de repli.
3. Ajouter le nom natif et les libellés accessibles dans les traductions `common`, puis étendre le sélecteur de langue et son indicateur, actuellement prévus pour deux choix. Ajouter l’icône correspondante dans `frontend/public/flags/` si le sélecteur conserve des drapeaux.
4. Vérifier les formats de dates/nombres dans `format.ts`, ainsi que les libellés météo, la description SEO et les pluriels. Étendre les tests de ressources à la nouvelle langue : mêmes domaines, clés sémantiques et interpolations, avec les formes plurielles propres à cette langue.
5. Étendre les tests de détection, de sélecteur et les scénarios e2e : navigation au clavier, persistance après rechargement, changement pendant un formulaire et affichage mobile. Une langue de droite à gauche nécessite aussi la direction du document et une vérification des dispositions.

## Vérification

Les tests couvrent la détection, le stockage indisponible, le repli, la parité des clés/interpolations, les codes d’erreur et leur rendu, la météo, les formats, les pluriels et le changement de langue pendant l’utilisation. Les tests de composants continuent de vérifier les parcours existants avec une langue explicite.

Après `npm run build`, `PLAYWRIGHT_BROWSERS_PATH=<chemin si nécessaire> npm exec -w e2e -- playwright test --config i18n.config.ts` vérifie la version de production avec une API simulée : pages principales dans les deux langues, largeurs 390 et 1440 px, conservation des saisies et choix mémorisé après rechargement. Cette suite ne nécessite ni base de données ni envoi d’emails. La suite e2e complète conserve ses exigences de backend, base de données et Mailpit.

L’audit Lighthouse de l’issue #72 est désormais automatisé dans la CI avec `npm run lighthouse`. Les quatre catégories doivent atteindre au moins 95 : médiane de trois mesures pour la performance, minimum pour l’accessibilité, les bonnes pratiques et le SEO. Le scénario desktop utilise des données et une miniature fixes pour suivre les régressions du frontend. Voir les [consignes Lighthouse](../testing.md#lighthouse-regression-checks) pour les commandes, rapports et limites du scénario.
