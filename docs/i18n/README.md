# Internationalisation FR / EN

## Inventaire initial

L’état initial mélangeait le français et l’anglais, parfois dans une même phrase. [inventory.md](inventory.md) et [inventory.json](inventory.json) conservent la photographie du commit initial : 105 fichiers de production, 810 occurrences textuelles candidates, 343 expressions affichées et 39 sites de formatage. Les doublons, marques, unités et constantes techniques sont inclus pour examen : ce ne sont pas 810 traductions distinctes. Les lignes de cette photographie restent celles du code avant migration.

## Interface migrée

Les ressources de `frontend/src/i18n/locales/en` et `fr` couvrent les routes publiques et authentifiées, les dialogues, le catalogue, les widgets et leurs attributs accessibles.

| Domaine | Couverture |
| --- | --- |
| `common` | Navigation, langue, thème, actions, export/suppression, cookies, erreurs de rendu |
| `auth` | Connexion, inscription, OAuth, codes, mot de passe oublié, décor |
| `account` | Profil, changement d’adresse e-mail et confirmations |
| `services` | Connexions, comptes OAuth, clés, descriptions et états |
| `widgets` | Catalogue, paramètres, configuration, titres, chargements, rechargements |
| `markets` | Cryptomonnaies, actions, statistiques, périodes et graphiques |
| `weather`, `github`, `youtube`, `chatbot` | Libellés, conditions météo, actions et états des widgets |
| `admin` | Filtres, comptes, pluriels, dates, actions et confirmations |
| `legal` | CGU et politique de confidentialité complètes |
| `errors` | Messages correspondant aux codes API, à la validation et aux erreurs Better Auth |

Les libellés des constantes de catalogue et les titres sont résolus dans la langue courante. Le changement de langue recalcule la présentation du catalogue sans recharger `/about.json`. Il conserve les identifiants, paramètres, périodes, configurations enregistrées, saisies et conversations.

`format.ts` applique la langue choisie aux dates et nombres. Les valeurs de périodes transmises à l’API (`1W`, `5Y`, `ALL`, etc.), les unités et les devises restent inchangées ; seuls leurs libellés et formats d’affichage changent.

## Initialisation et sélection

`i18n/index.ts` initialise i18next avant le premier rendu, avec les ressources embarquées et `initReactI18next`. Le provider est installé dans `main.tsx`. Les traductions ne nécessitent aucune requête réseau.

La priorité est : choix enregistré dans `dashboard-language`, première langue supportée du navigateur, puis anglais. Les variantes comme `fr-FR`, `fr-CA` et `en-US` sont ramenées à `fr` ou `en`. Seul un choix explicite est mémorisé. Un stockage indisponible n’empêche pas le sélecteur de changer la langue pendant la visite.

Le sélecteur est présent dans la navigation authentifiée et sur les pages publiques. Il utilise les noms natifs des langues, un label accessible et un contrôle natif utilisable au clavier. `html.lang` est synchronisé à l’initialisation et à chaque changement.

## Messages API et contenus externes

Les erreurs des routes API ajoutent `code` tout en conservant `error` pour les consommateurs existants. `shared/src/apiErrors.ts` associe les messages existants à des codes stables à la frontière du serveur. Les nouveaux cas devraient fournir leur code explicitement ; `HttpError` et `apiError` permettent de le transmettre. Les erreurs Better Auth sont lues par leur code, avec quelques alias documentés dans `i18n/errors.ts`.

Le frontend garde l’objet d’erreur ou la clé de notification jusqu’au rendu. Ainsi, un message d’erreur ou de succès déjà affiché suit le changement de langue. Les codes inconnus et diagnostics de fournisseurs utilisent un message générique traduit ; l’interface ne compare pas des phrases anglaises pour décider d’une action. Les métadonnées de rechargement (`Retry-After`, statut) sont préservées.

Les états des services sont reconstruits à partir de données structurées (`accounts`, `verifiedAt`, `keyHint`), sans afficher les phrases déjà formatées par le serveur. Les avertissements YouTube exposent aussi un code. La météo fournit `conditionCode` : les conditions et textes alternatifs sont traduits selon les identifiants [OpenWeather](https://openweathermap.org/api/weather-conditions). Pour les anciennes réponses en cache sans code, l’icône donne un repli descriptif traduit.

Les noms, publications, descriptions et biographies GitHub/YouTube, entreprises, modèles Ollama et messages saisis ou générés sont conservés dans leur langue d’origine. Seuls le message d’accueil et les messages d’état générés par l’application dans le chatbot sont traduits.

La localisation des emails envoyés par le backend et des contrôles internes du lecteur YouTube intégré reste hors de cette migration de l’interface React. Les logs, Swagger et diagnostics d’exploitation ne sont pas des textes d’interface.

## Conventions

1. Ajouter les traductions dans les deux fichiers JSON du domaine et enregistrer tout nouveau domaine dans `resources.ts`.
2. Utiliser des clés sémantiques (`auth:login`), typées à partir des ressources anglaises. Un composant qui affiche une traduction doit s’abonner avec `useTranslation`, même si un helper partagé résout la traduction via l’instance `i18n`.
3. Écrire les phrases entières avec interpolation (`{{name}}`, `{{count}}`). Utiliser les pluriels i18next et `Trans` avec un namespace explicite pour les phrases contenant des liens.
4. Employer `changeLanguage` exporté par `@/i18n` pour mémoriser une sélection explicite. Ne pas stocker une traduction résolue dans une constante de module ou dans l’état d’un formulaire.
5. Préférer « tableau de bord », « widget », « compte », « service », « adresse e-mail », « bannissement » et « actualiser » en français ; conserver les marques et noms personnels.

## Vérification

Les tests couvrent la détection, le stockage indisponible, le repli, la parité des clés/interpolations, les codes d’erreur et leur rendu, la météo, les formats, les pluriels et le changement de langue pendant l’utilisation. Les tests de composants continuent de vérifier les parcours existants avec une langue explicite.

Après `npm run build`, `PLAYWRIGHT_BROWSERS_PATH=<chemin si nécessaire> npm exec -w e2e -- playwright test --config i18n.config.ts` vérifie la version de production avec une API simulée : pages principales dans les deux langues, largeurs 390 et 1440 px, conservation des saisies et choix mémorisé après rechargement. Cette suite ne nécessite ni base de données ni envoi d’emails. La suite e2e complète conserve ses exigences de backend, base de données et Mailpit.

L’audit Lighthouse de l’issue #72 est reporté à une étape ultérieure, à la demande de l’utilisateur. Aucun score Lighthouse n’est revendiqué ici.
