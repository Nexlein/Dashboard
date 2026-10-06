# Inventaire des textes — 6 octobre 2026

Photographie du commit `91842b4b17162f27aace3d3acf6959fd1227851f`, avant installation de la base i18n. 105 fichiers de production analysés, 810 occurrences textuelles candidates, 343 expressions affichées et 39 sites de formatage. Les occurrences répétées restent séparées pour ne pas oublier un écran.

Cet inventaire couvre les textes JSX, les attributs accessibles, les placeholders, les libellés de catalogue, les messages de validation et les erreurs définies dans le frontend, shared et backend. Les constantes de protocole, routes, CSS, types et tests sont exclues. Les marques, exemples, unités et identifiants présents dans des propriétés de présentation sont conservés pour décision humaine ; chaque entrée n’est donc pas nécessairement une traduction à créer. Les templates gardent leurs interpolations.

Les expressions affichées et les formats sont disponibles dans [inventory.json](inventory.json). Les expressions recensent les données externes, les messages reçus et les compositions de phrases : elles doivent être suivies jusqu’à leur source lors de la migration. Les textes générés par Better Auth/Zod et ceux provenant de fournisseurs externes ne sont pas exhaustivement énumérables depuis notre code ; voir [README.md](README.md) pour leur traitement.

## backend/src/app.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 27 | message-or-constant | trust proxy |
| 33 | property:name | global |
| 36 | property:message | Too many requests from this IP, please try again later. |
| 44 | message-or-constant | Content-Type |
| 54 | property:name | auth |
| 57 | property:message | Too many authentication attempts. Please try again later. |
| 68 | property:title | Dashboard API |
| 70 | property:description | API documentation for the Dashboard project |

## backend/src/auth.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 46 | message-or-constant | GitHub refused the authorization code |
| 59 | property:message | You must accept the CGU and confirm you are 16 or older to register. |
| 162 | property:message | GitHub service accounts cannot be used to sign in. |
| 206 | property:message | The role must be "user" or "admin". |
| 214 | property:message | You cannot change your own role. |
| 221 | property:message | Sign-in by code is not available. |
| 257 | property:message | Your GitHub account needs a verified email address. |

## backend/src/controllers/account.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 49 | message-or-constant | User not found |
| 50 | message-or-constant | Cache-Control |
| 60 | message-or-constant | Internal server error |

## backend/src/controllers/chatbot.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 6 | message-or-constant | Failed to fetch models from Ollama |
| 14 | message-or-constant | Model name is required |
| 25 | message-or-constant | Failed to pull model |
| 29 | template | Model ${model} pulled successfully |

## backend/src/controllers/health.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 6 | template | SELECT 1 |
| 13 | property:message | Database connection failed |

## backend/src/controllers/services.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 53 | template | ${accounts.length} account${accounts.length > 1 ? 's' : ''} connected |
| 56 | template | Connected on ${connection.verifiedAt.toLocaleDateString()} |
| 83 | message-or-constant | Service not found |
| 84 | message-or-constant | Service is not configurable |
| 86 | message-or-constant | Use OAuth flow for this service |
| 88 | message-or-constant | Service does not accept an API key |
| 92 | message-or-constant | API key is required |
| 95 | message-or-constant | API key is too long |
| 131 | message-or-constant | Service not found |
| 132 | message-or-constant | Service is not configurable |
| 155 | message-or-constant | Service not found |
| 160 | message-or-constant | Account not found |
| 168 | message-or-constant | Service not found |
| 170 | message-or-constant | Service does not support search |
| 183 | template | ${service.displayName \|\| service.name} is not connected |

## backend/src/controllers/widgets.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 25 | property:message | Refresh rate must be at least 60 seconds |
| 53 | property:message | Messages array is required |
| 90 | template | ${service.displayName \|\| service.name} is not connected |
| 102 | template | Choose which ${service.displayName} account to use |
| 111 | template | This ${service.displayName} account no longer works: reconnect it in Services |
| 153 | template | Unknown service: ${serviceName} |
| 159 | template | Unknown widget: ${widgetName} in service ${serviceName} |
| 177 | message-or-constant | Widget validation failed |
| 216 | message-or-constant | Invalid widget id |
| 218 | message-or-constant | Widget not found |
| 220 | message-or-constant | Unauthorized to view this widget |
| 223 | message-or-constant | Service not found |
| 232 | message-or-constant | Widget data is not available for this service |
| 244 | message-or-constant | Retry-After |
| 250 | message-or-constant | Failed to fetch widget data |
| 260 | message-or-constant | Invalid widget id |
| 266 | message-or-constant | Widget not found |
| 268 | message-or-constant | Unauthorized to update this widget |
| 275 | message-or-constant | Widget validation failed |
| 293 | message-or-constant | Invalid widget id |
| 295 | message-or-constant | Widget not found |
| 297 | message-or-constant | Unauthorized to delete this widget |
| 305 | message-or-constant | Invalid widget id |
| 310 | message-or-constant | Widget not found |
| 312 | message-or-constant | Unauthorized |
| 316 | message-or-constant | Widget does not support chat |
| 328 | message-or-constant | Failed to communicate with chatbot |

## backend/src/middleware/auth.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 21 | message-or-constant | Authentication required |
| 23 | message-or-constant | Origin |
| 25 | message-or-constant | Request origin not allowed |
| 37 | message-or-constant | Authentication required |

## backend/src/middleware/errorHandler.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 15 | message-or-constant | Resource already exists (conflict) |
| 18 | message-or-constant | Resource not found |
| 22 | message-or-constant | Internal server error |

## backend/src/services/chatbot.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 5 | property:name | chatbot |
| 8 | property:name | ai_chat |
| 9 | property:description | Interactive AI Chatbot |
| 10 | property:name | model |
| 17 | message-or-constant | Missing model parameter |
| 33 | template | Ollama API Error: ${res.statusText} |

## backend/src/services/crypto.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 35 | message-or-constant | CoinGecko is not connected. Configure it in Services. |
| 54 | message-or-constant | CoinGecko provider is unavailable |
| 58 | message-or-constant | CoinGecko API key is invalid |
| 63 | message-or-constant | CoinGecko API rate limit reached |
| 66 | message-or-constant | CoinGecko provider request failed |
| 83 | message-or-constant | CoinGecko API key could not be verified |
| 90 | template | ${field} is invalid |
| 101 | message-or-constant | Coin |
| 105 | template | Select between 1 and ${MAX_CHART_COINS} cryptocurrencies |
| 210 | message-or-constant | Chart period is invalid |
| 229 | message-or-constant | Unsupported crypto widget |
| 232 | message-or-constant | Currency |
| 263 | template | No chart data found for ${coin} |
| 292 | message-or-constant | Coin |
| 313 | message-or-constant | Cryptocurrency or currency not found |
| 332 | property:name | crypto |
| 333 | property:displayName | CoinGecko |
| 334 | property:description | Cryptocurrency prices and market history |
| 337 | property:label | CoinGecko Demo API key |
| 342 | property:name | crypto_price |
| 343 | property:description | Displays the current price and 24-hour change of a cryptocurrency |
| 345 | property:name | coin |
| 346 | property:name | currency |
| 350 | property:name | crypto_chart |
| 351 | property:description | Compares historical price performance for multiple cryptocurrencies |
| 353 | property:name | coins |
| 354 | property:name | currency |
| 355 | property:name | days |

## backend/src/services/github.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 49 | template | Bearer ${credentials.accessToken} |
| 54 | template | GitHub API error: ${res.statusText} |
| 60 | property:name | github |
| 61 | property:displayName | GitHub |
| 64 | property:label | GitHub accounts |
| 70 | property:name | repo_stats |
| 71 | property:description | Displays stars, forks, and open issues for a repository |
| 73 | property:name | account |
| 74 | property:name | owner |
| 75 | property:name | repo |
| 79 | property:name | latest_commits |
| 80 | property:description | Displays the latest commits from a branch |
| 82 | property:name | account |
| 83 | property:name | owner |
| 84 | property:name | repo |
| 85 | property:name | branch |
| 89 | property:name | user_profile |
| 90 | property:description | Displays a GitHub user profile |
| 92 | property:name | account |
| 93 | property:name | username |
| 108 | message-or-constant | GitHub account is not connected |
| 179 | message-or-constant | Unknown widget name |

## backend/src/services/stockProvider.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 14 | message-or-constant | Stock data is waiting for available Twelve Data credits |
| 34 | message-or-constant | Another stock widget is loading; your data will follow automatically |
| 46 | message-or-constant | if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0 |
| 124 | message-or-constant | The daily Twelve Data limit is reached; loading will resume after its reset |

## backend/src/services/stocks.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 97 | message-or-constant | Twelve Data is not connected. Configure it in Services. |
| 121 | message-or-constant | Twelve Data provider is unavailable |
| 126 | message-or-constant | Twelve Data API key is invalid or lacks access |
| 134 | message-or-constant | Twelve Data request failed |
| 150 | message-or-constant | Twelve Data API rate limit reached |
| 151 | message-or-constant | Twelve Data request failed |
| 166 | message-or-constant | Twelve Data API key could not be verified |
| 189 | template | Select between 1 and ${MAX_STOCKS} valid stock symbols |
| 197 | message-or-constant | Stock chart period is invalid |
| 242 | template | ${cacheScope}:stocks:unavailable:${symbol}:${period \|\| 'quote'} |
| 252 | message-or-constant | Not available with the connected Twelve Data plan |
| 253 | message-or-constant | No market data available |
| 318 | template | Stock symbol not found: ${symbol} |
| 347 | template | ${cacheScope}:stocks:history:${symbol}:${period} |
| 402 | template | No market data found for ${symbol} |
| 408 | template | ${cacheScope}:stocks:history:${symbol}:${period} |
| 423 | message-or-constant | Enter a stock name or symbol |
| 477 | message-or-constant | Unsupported stock widget |
| 481 | message-or-constant | Select exactly one company for a stock profile |
| 513 | property:message | No market data available |
| 542 | property:name | stocks |
| 543 | property:displayName | Twelve Data |
| 544 | property:description | Stock prices and historical market data |
| 547 | property:label | Twelve Data API key |
| 552 | property:name | stock_market |
| 553 | property:description | Compares current and historical prices for listed companies |
| 555 | property:name | symbols |
| 556 | property:name | period |
| 560 | property:name | stock_profile |
| 561 | property:description | A single company price, daily change and historical price chart |
| 563 | property:name | symbols |
| 564 | property:name | period |

## backend/src/services/weather.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 46 | message-or-constant | OpenWeather is not connected. Configure it in Services. |
| 68 | message-or-constant | Weather provider is unavailable |
| 75 | message-or-constant | Weather API key is invalid or not active yet |
| 78 | message-or-constant | Weather API rate limit reached |
| 80 | message-or-constant | Weather provider request failed |
| 93 | message-or-constant | City not found |
| 163 | message-or-constant | City is required |
| 165 | message-or-constant | Unsupported weather widget |
| 219 | message-or-constant | London |
| 223 | property:name | weather |
| 224 | property:displayName | OpenWeather |
| 225 | property:description | Current weather and forecasts |
| 228 | property:label | OpenWeather API key |
| 233 | property:name | current_weather |
| 234 | property:description | Displays current temperature for a city |
| 235 | property:name | city |
| 238 | property:name | forecast |
| 239 | property:description | Displays 5-day weather forecast |
| 240 | property:name | city |

## backend/src/services/youtube.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 7 | property:name | youtube |
| 8 | property:displayName | YouTube |
| 9 | property:description | Videos and a public channel watch feed — no API key required |
| 12 | property:name | video_player |
| 13 | property:description | Embeds a YouTube video player without credentials |
| 14 | property:name | video_url |
| 17 | property:name | channel_watch |
| 18 | property:description | Latest publications from up to five public YouTube channels |
| 19 | property:name | channels |
| 25 | message-or-constant | Add between 1 and 5 valid YouTube channels |
| 28 | message-or-constant | Unsupported YouTube widget |
| 30 | message-or-constant | Enter a valid YouTube video link |
| 34 | message-or-constant | This widget does not provide feed data |

## backend/src/services/youtubeFeed.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 36 | message-or-constant | Channel not found |
| 36 | message-or-constant | YouTube is temporarily unavailable |
| 39 | message-or-constant | YouTube returned an empty response |
| 48 | message-or-constant | YouTube response is too large |
| 67 | message-or-constant | YouTube is temporarily unavailable. |
| 88 | message-or-constant | Cannot resolve this handle. Try its youtube.com/channel/UC… link. |
| 105 | message-or-constant | Invalid YouTube feed |
| 113 | message-or-constant | Invalid YouTube channel feed |
| 176 | property:message | Refresh unavailable; showing saved publications. |
| 179 | property:message | YouTube is temporarily unavailable. |
| 187 | message-or-constant | Add between 1 and 5 valid YouTube channels |

## backend/src/utils/encryption.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 23 | message-or-constant | ENCRYPTION_KEY or BETTER_AUTH_SECRET must be set in environment variables |
| 68 | message-or-constant | Failed to decrypt parameters |

## backend/src/utils/env.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 24 | message-or-constant | DATABASE_URL must be a valid URL |
| 26 | message-or-constant | DATABASE_URL must not reference other variables |
| 30 | message-or-constant | BETTER_AUTH_SECRET must be at least 32 characters long |
| 33 | message-or-constant | BETTER_AUTH_URL must be a valid URL |
| 38 | message-or-constant | ENCRYPTION_KEY must be at least 32 characters long |
| 41 | message-or-constant | REDIS_URL must be a valid URL |
| 65 | property:message | SMTP_HOST is required in production: users must receive their codes |

## backend/src/utils/mailer.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 17 | template | Dashboard <${env.SMTP_USER}> |
| 17 | message-or-constant | Dashboard <no-reply@localhost> |

## backend/src/utils/oauthAccounts.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 21 | message-or-constant | No access token for this account |

## backend/src/utils/otpEmails.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 7 | property:subject | Votre code de vérification |
| 8 | property:intro | Saisissez ce code pour confirmer votre adresse email : |
| 11 | property:subject | Réinitialisation de votre mot de passe |
| 12 | property:intro | Saisissez ce code pour choisir un nouveau mot de passe : |
| 15 | property:subject | Confirmez votre nouvelle adresse email |
| 16 | property:intro | Saisissez ce code pour utiliser cette adresse sur votre compte : |
| 21 | message-or-constant | Il expire dans 5 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email. |
| 29 | template | Dashboard : ${subject} |
| 31 | template | <p>${intro}</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p><p>${EXPIRY}</p> |

## backend/src/utils/rateLimit.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 57 | message-or-constant | Redis is unavailable |
| 96 | template | rl:${name}: |

## frontend/src/App.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 53 | jsx | Dashboard |

## frontend/src/components/CookieBanner.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 21 | attribute:aria-label | Cookie consent |
| 24 | jsx | We use strictly necessary cookies/local storage for authentication and preferences. By clicking "Accept", you consent to our use of these technologies. |
| 27 | jsx | Read our Privacy Policy |
| 29 | jsx | . |
| 33 | jsx | Decline |
| 36 | jsx | Accept |

## frontend/src/components/ErrorBoundary.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 37 | jsx | Something went wrong |
| 42 | jsx | Try again |

## frontend/src/components/Navbar.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 46 | message-or-constant | Compte |
| 77 | message-or-constant | Le téléchargement a échoué. Veuillez réessayer. |
| 86 | message-or-constant | Supprimer définitivement votre compte et toutes ses données ? Cette action est irréversible. |
| 98 | message-or-constant | Par sécurité, reconnectez-vous puis supprimez votre compte. |
| 99 | message-or-constant | La suppression n’a pas pu être confirmée. Veuillez réessayer. |
| 121 | jsx | Dashboard |
| 134 | jsx | Services |
| 148 | jsx | Administration |
| 161 | template | Ouvrir le menu du compte ${accountLabel} |
| 188 | jsx | Thème |
| 193 | jsx | Thème clair |
| 201 | jsx | Thème sombre |
| 211 | jsx | Edit Profile |
| 216 | jsx | Data & Privacy (GDPR) |
| 223 | jsx | Privacy Policy |
| 231 | jsx | Download My Data |
| 242 | jsx | Delete My Account |
| 250 | jsx | Se déconnecter |

## frontend/src/components/ProfileSettingsModal.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 27 | jsx | Profile Settings |
| 78 | message-or-constant | Profile updated successfully |
| 86 | message-or-constant | Email address updated |
| 99 | jsx | We sent a 6-digit code to |
| 101 | jsx | . Your address changes once you enter it. |
| 105 | jsx | Verification code |
| 120 | jsx-expression | Checking... |
| 120 | jsx-expression | Confirm Email |
| 137 | jsx | Display Name |
| 146 | jsx | Email Address |
| 155 | jsx | A new address is confirmed with a code sent to it. |
| 163 | jsx-expression | Saving... |
| 163 | jsx-expression | Save Changes |

## frontend/src/components/ui/dialog.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 44 | jsx | Close |

## frontend/src/features/admin/components/BanUserDialog.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 23 | property:label | 1 jour |
| 24 | property:label | 7 jours |
| 25 | property:label | 30 jours |
| 26 | property:label | Jusqu’à levée du bannissement |
| 51 | message-or-constant | Le bannissement a échoué. |
| 61 | jsx | Bannir |
| 62 | jsx | L’utilisateur est déconnecté de tous ses appareils et ne peut plus se connecter pendant la durée choisie. |
| 68 | jsx | Motif (facultatif, visible par l’équipe) |
| 73 | attribute:placeholder | ex. spam |
| 78 | jsx | Durée |
| 98 | jsx | Annuler |
| 102 | jsx-expression | Bannissement… |
| 102 | jsx-expression | Bannir |

## frontend/src/features/admin/components/UserActions.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 32 | template | Actions pour ${label} |
| 42 | jsx | Retirer le rôle administrateur |
| 47 | jsx | Nommer administrateur |
| 52 | jsx | Déconnecter de partout |
| 57 | jsx | Lever le bannissement |
| 62 | jsx | Bannir… |
| 68 | jsx | Supprimer le compte |

## frontend/src/features/auth/components/AuthBackground.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 18 | jsx | Dashboard |
| 23 | jsx | Add Widget |
| 27 | jsx | U |
| 29 | jsx | Mon espace |
| 39 | jsx | Vue d’ensemble |
| 40 | jsx | 12 480 |
| 65 | jsx | Météo |
| 66 | jsx | Aujourd’hui |
| 73 | jsx | 21° |
| 76 | jsx | Ensoleillé |
| 89 | jsx | GitHub |
| 90 | jsx | Activité récente |
| 96 | jsx | CI/CD Pipeline |
| 100 | jsx | Tests unitaires |
| 111 | jsx | Performances |
| 112 | jsx | Temps de réponse |
| 116 | jsx | 42 |
| 117 | jsx | ms |
| 119 | jsx | -12ms depuis hier |
| 129 | jsx | Système opérationnel |
| 133 | jsx | Tous les services fonctionnent normalement sans aucune interruption détectée. |

## frontend/src/features/auth/components/EmailCodeForm.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 14 | message-or-constant | Une erreur est survenue. Réessayez plus tard. |
| 43 | message-or-constant | Un nouveau code vient d’être envoyé. |
| 51 | jsx | Nous avons envoyé un code à 6 chiffres à |
| 53 | jsx | . Il expire dans 5 minutes. |
| 57 | jsx | Code de vérification |
| 81 | jsx-expression | Vérification… |
| 81 | jsx-expression | Vérifier |
| 83 | jsx | Renvoyer le code |

## frontend/src/features/services/components/ConnectedAccounts.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 31 | message-or-constant | Unable to start linking flow |
| 37 | template | Disconnect ${label} from ${service.displayName}? |
| 40 | message-or-constant | Unable to disconnect account |
| 47 | template | ${service.displayName} accounts |
| 49 | jsx-expression | Account no longer accessible |
| 67 | jsx | Remove it, then connect it again. |
| 76 | template | Disconnect ${label} |
| 99 | template | Connect another ${service.displayName} account |
| 100 | template | Connect a ${service.displayName} account |
| 102 | jsx | Connect each account whose data your widgets show: |
| 103 | jsx | asks which account to use, and lets you sign in to another one. This is separate from signing in to the Dashboard with |
| 105 | jsx | . |

## frontend/src/features/services/components/ServiceCard.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 34 | message-or-constant | Unable to connect service |
| 41 | template | Disconnect ${service.displayName}? |
| 47 | message-or-constant | Unable to disconnect service |
| 63 | jsx-expression | Statistiques et activité des dépôts |
| 64 | jsx-expression | Current weather and forecasts |
| 75 | jsx-expression | Connected |
| 75 | jsx-expression | Not connected |
| 85 | jsx | API key verified |
| 86 | jsx | Key ending in •••• |
| 96 | jsx-expression | API key |
| 103 | attribute:placeholder | Paste your API key |
| 112 | jsx-expression | Replace |
| 112 | jsx-expression | Connect |
| 115 | jsx | The key is verified, encrypted and never displayed again. |
| 123 | jsx | Replace key |
| 134 | jsx | Disconnect |
| 149 | jsx | Get an API key |

## frontend/src/features/services/components/ServiceLogo.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 11 | property:name | OpenWeather |
| 12 | property:name | GitHub |
| 13 | property:name | YouTube |
| 14 | property:name | CoinGecko |
| 15 | property:name | Twelve Data |
| 16 | property:name | Ollama |
| 46 | template | ${label} logo |
| 55 | template | ${label} logo |

## frontend/src/features/widgets/catalog/ChatbotWidget.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 23 | message-or-constant | Hello! How can I help you today? |
| 25 | message-or-constant | Hello! How can I help you today? |
| 53 | message-or-constant | Error: Could not get a response. |
| 142 | message-or-constant | Hello! How can I help you today? |
| 146 | attribute:title | Clear Chat |
| 149 | jsx | Clear Chat |
| 154 | attribute:placeholder | Type a message... |
| 164 | jsx | Send |

## frontend/src/features/widgets/catalog/CryptoChartWidget.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 47 | property:label | 1W |
| 48 | property:label | 1M |
| 49 | property:label | 3M |
| 50 | property:label | 1Y |
| 216 | jsx | % |
| 251 | attribute:aria-label | Chart period |
| 281 | attribute:aria-label | Cryptocurrency performance chart |
| 304 | jsx | % |
| 345 | jsx | Select a market from the legend |

## frontend/src/features/widgets/catalog/CryptoPrice.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 51 | jsx | % |
| 58 | jsx | 24-hour market change |
| 62 | jsx | Market cap |
| 68 | jsx | 24h volume |

## frontend/src/features/widgets/catalog/GithubWidgets.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 40 | jsx | No description provided. |
| 81 | jsx | @ |
| 88 | jsx | No bio provided. |
| 95 | jsx | Followers |
| 100 | jsx | Following |
| 107 | jsx | Repos |
| 121 | jsx | Latest Commits |

## frontend/src/features/widgets/catalog/OllamaLogo.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 5 | attribute:alt | Ollama |

## frontend/src/features/widgets/catalog/OllamaModelManager.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 9 | property:name | Llama 3.2 (1B) - Very Fast |
| 10 | property:name | Qwen 2 (1.5B) - Smart & Light |
| 11 | property:name | Llama 3 (8B) - Powerful |
| 45 | jsx | Recommended Models |
| 49 | attribute:aria-label | Refresh installed models |
| 85 | jsx | Selected |
| 88 | jsx-expression | Select |
| 102 | jsx | Pulling... |
| 107 | jsx | Install |
| 142 | jsx | Selected |
| 145 | jsx-expression | Select |
| 156 | attribute:aria-label | Custom model tag |
| 157 | attribute:placeholder | Custom model tag (e.g. mistral) |
| 173 | jsx-expression | Pull |

## frontend/src/features/widgets/catalog/StockMarketWidget.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 42 | message-or-constant | 1W |
| 42 | message-or-constant | 1M |
| 42 | message-or-constant | 1Y |
| 42 | message-or-constant | 5Y |
| 42 | message-or-constant | ALL |
| 223 | jsx | % |
| 261 | attribute:aria-label | Stock chart period |
| 287 | attribute:aria-label | Stock performance comparison chart |
| 310 | jsx | % |
| 351 | jsx | Select a stock from the legend |

## frontend/src/features/widgets/catalog/StockProfileWidget.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 5 | message-or-constant | 1W |
| 5 | message-or-constant | 1M |
| 5 | message-or-constant | 1Y |
| 5 | message-or-constant | 5Y |
| 5 | message-or-constant | ALL |
| 47 | jsx | No company data available. |
| 96 | jsx-expression | Listed stock |
| 96 | jsx | · |
| 115 | jsx | Last trading session |
| 124 | attribute:aria-label | Stock chart period |
| 162 | template | ${stock.symbol} price history chart |
| 258 | jsx | No price history available for this period. |
| 266 | jsx | Lowest close |
| 272 | jsx | Highest close |
| 278 | jsx | Period change |

## frontend/src/features/widgets/catalog/WeatherWidgets.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 41 | jsx | , |
| 43 | jsx | °C |
| 49 | jsx | Feels |
| 49 | jsx | °C |
| 52 | jsx | % |
| 56 | jsx | m/s |
| 67 | jsx | , |
| 81 | jsx | ° |
| 82 | jsx | ° |

## frontend/src/features/widgets/catalog/YouTubeVideoWidget.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 10 | jsx | Edit this widget and enter a valid YouTube video link. |
| 30 | attribute:title | YouTube video player |
| 33 | message-or-constant | autoplay; encrypted-media; fullscreen; picture-in-picture |
| 40 | attribute:aria-label | Play YouTube video |
| 58 | jsx | Play video |
| 71 | jsx | Stop video |
| 74 | jsx | Ready to play |
| 81 | jsx | Open on YouTube |

## frontend/src/features/widgets/catalog/YouTubeWatchWidget.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 63 | message-or-constant | Unable to refresh the feed |
| 81 | jsx | Channel Watch |
| 86 | attribute:aria-label | Mark visible publications as seen |
| 87 | attribute:title | Mark as seen |
| 96 | attribute:aria-label | Refresh publications |
| 97 | attribute:title | Refresh |
| 108 | attribute:aria-label | Filter publications by channel |
| 110 | jsx-expression | All channels |
| 125 | jsx-expression | Showing saved publications. |
| 135 | jsx | : |
| 144 | jsx-expression | No recent publications from these channels. |
| 145 | jsx-expression | Channels are unavailable. Try refreshing or edit your channel list. |
| 166 | jsx | New |
| 196 | jsx | Updates every |
| 200 | jsx | · |
| 201 | jsx | channel(s) |

## frontend/src/features/widgets/components/DashboardGrid.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 33 | template | Delete ${widget.title}? |
| 70 | template | Configure ${widget.title} |
| 89 | jsx | Edit |
| 96 | jsx | Delete |

## frontend/src/features/widgets/components/WidgetConfigurator.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 136 | message-or-constant | Failed to create widget |
| 145 | jsx | Add Widget |
| 149 | jsx | Add New Widget |
| 150 | jsx | Configure a new widget for your dashboard. |
| 156 | jsx | Service |
| 166 | attribute:placeholder | Loading services… |
| 167 | attribute:placeholder | Select a service... |
| 188 | jsx | Unable to load the available services: |
| 195 | jsx | Widget Type |
| 202 | attribute:placeholder | Select a widget type... |
| 220 | jsx | is not connected |
| 225 | template | Please link your ${selectedConnection?.displayName \|\| service} account in Services before creating this widget. |
| 226 | template | Add and verify your personal API key in Services before creating a ${service} widget. |
| 236 | jsx | Open Services |
| 246 | jsx | Checking service connection… |
| 275 | jsx-expression | Adding... |
| 275 | jsx-expression | Add to Dashboard |

## frontend/src/features/widgets/components/WidgetEditDialog.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 64 | message-or-constant | Failed to update widget |
| 74 | jsx | Edit Widget |
| 75 | jsx | Modify the settings for your |
| 76 | jsx-expression | Widget |
| 76 | jsx | . |
| 102 | jsx | Cancel |
| 111 | jsx-expression | Saving... |
| 111 | jsx-expression | Save Changes |

## frontend/src/features/widgets/components/WidgetForm.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 51 | jsx | Refresh Rate (seconds) |
| 59 | jsx | Minimum refresh rate is |
| 60 | jsx | s. |

## frontend/src/features/widgets/components/WidgetParameterField.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 58 | jsx | / |
| 58 | jsx | selected |
| 62 | attribute:aria-label | Selected cryptocurrencies |
| 72 | template | Remove ${coin} |
| 91 | attribute:aria-label | CoinGecko coin ID |
| 107 | attribute:aria-label | Add cryptocurrency |
| 113 | attribute:aria-label | Popular cryptocurrencies |
| 124 | jsx | + |
| 129 | jsx | Enter any CoinGecko coin ID. Press Enter or comma to add it. |
| 160 | message-or-constant | Unable to search stocks |
| 190 | jsx | / |
| 190 | jsx | selected |
| 194 | attribute:aria-label | Selected stocks |
| 204 | template | Remove ${symbol} |
| 225 | attribute:aria-label | Search stocks |
| 248 | attribute:aria-label | Add stock symbol |
| 258 | attribute:aria-label | Stock search results |
| 283 | attribute:aria-label | Popular stocks |
| 293 | jsx | + |
| 294 | jsx | ( |
| 294 | jsx | ) |
| 316 | jsx | Connect a |
| 317 | jsx | account in |
| 318 | jsx | Services |
| 320 | jsx | first. |
| 331 | attribute:placeholder | Choose an account |
| 336 | template | Account #${account.id} (no longer accessible) |
| 402 | attribute:placeholder | Select an option |

## frontend/src/features/widgets/components/WidgetRenderer.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 91 | jsx | This widget is not implemented yet. |
| 116 | jsx | Loading data progressively |
| 118 | jsx | Automatic retry in |
| 119 | jsx | seconds. |
| 126 | message-or-constant | Configure it in Services |
| 129 | jsx | Error loading |
| 137 | jsx | Open Services |
| 156 | jsx | Refresh unavailable: |
| 157 | jsx | . Showing previously loaded data. |
| 166 | template | Waiting for API credits. Automatic retry in ${retryAfter} seconds. |
| 168 | template | Refresh unavailable: ${error} |
| 169 | jsx-expression | Loading the requested period… |
| 169 | jsx | Showing previously loaded data ( |
| 171 | jsx | ). |

## frontend/src/features/widgets/components/YouTubeChannelsField.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 28 | message-or-constant | Enter a YouTube channel link, @handle or channel ID. Maximum 5 channels. |
| 39 | jsx | /5 |
| 41 | attribute:aria-label | Selected YouTube channels |
| 50 | template | Remove ${channel} |
| 66 | attribute:placeholder | https://www.youtube.com/@channel |
| 85 | attribute:aria-label | Add channel |
| 92 | jsx | Add up to 5 public channels. Paste a link or @handle, then press +. Updates every 10 minutes. |

## frontend/src/features/widgets/lib/registry.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 19 | property:name | Weather |
| 24 | property:name | Current Temperature |
| 27 | property:label | City Name |
| 27 | property:placeholder | e.g. Paris |
| 32 | property:name | 5-Day Forecast |
| 35 | property:label | City Name |
| 35 | property:placeholder | e.g. Paris |
| 41 | property:name | GitHub |
| 47 | property:name | Repository Stats |
| 52 | property:label | GitHub account |
| 58 | property:label | Owner (Organization/User) |
| 60 | property:placeholder | e.g. facebook |
| 64 | property:label | Repository Name |
| 66 | property:placeholder | e.g. react |
| 73 | property:name | Latest Commits |
| 78 | property:label | GitHub account |
| 82 | property:label | Owner |
| 82 | property:placeholder | e.g. facebook |
| 85 | property:label | Repository Name |
| 87 | property:placeholder | e.g. react |
| 91 | property:label | Branch (optional) |
| 94 | property:placeholder | e.g. main |
| 101 | property:name | User Profile |
| 106 | property:label | GitHub account |
| 112 | property:label | GitHub Username (leave empty for your profile) |
| 115 | property:placeholder | e.g. nexlein |
| 122 | property:name | YouTube |
| 127 | property:name | Video Player |
| 134 | property:label | YouTube video link |
| 142 | property:name | Channel Watch |
| 144 | property:label | YouTube channels |
| 149 | property:name | Crypto |
| 154 | property:name | Price & Market Stats |
| 159 | property:label | CoinGecko Coin ID |
| 161 | property:placeholder | e.g. bitcoin, ethereum, solana |
| 165 | property:label | Currency |
| 167 | property:placeholder | e.g. eur or usd |
| 173 | property:name | Market Comparison Chart |
| 178 | property:label | Cryptocurrencies |
| 180 | property:placeholder | CoinGecko ID, e.g. dogecoin |
| 182 | property:label | BTC |
| 183 | property:label | ETH |
| 184 | property:label | SOL |
| 185 | property:label | BNB |
| 186 | property:label | XRP |
| 187 | property:label | ADA |
| 188 | property:label | DOGE |
| 189 | property:label | AVAX |
| 190 | property:label | LINK |
| 191 | property:label | DOT |
| 196 | property:label | Currency |
| 198 | property:placeholder | Select a currency |
| 200 | property:label | EUR (€) |
| 201 | property:label | USD ($) |
| 202 | property:label | GBP (£) |
| 207 | property:label | Period |
| 209 | property:placeholder | Select a period |
| 211 | property:label | 1 week |
| 212 | property:label | 1 month |
| 213 | property:label | 3 months |
| 214 | property:label | 1 year |
| 222 | property:name | Stock Market |
| 229 | property:name | Stock Comparison Chart |
| 234 | property:label | Companies |
| 236 | property:placeholder | Search by company or ticker |
| 238 | property:label | Apple |
| 239 | property:label | NVIDIA |
| 240 | property:label | Microsoft |
| 241 | property:label | Tesla |
| 246 | property:label | Period |
| 248 | message-or-constant | 1M |
| 249 | property:placeholder | Select a period |
| 251 | message-or-constant | 1W |
| 251 | property:label | 1 week |
| 252 | message-or-constant | 1M |
| 252 | property:label | 1 month |
| 253 | message-or-constant | 1Y |
| 253 | property:label | 1 year |
| 254 | message-or-constant | 5Y |
| 254 | property:label | 5 years |
| 255 | message-or-constant | ALL |
| 255 | property:label | All available history |
| 262 | property:name | Stock Profile |
| 267 | property:label | Company |
| 269 | property:placeholder | Search by company or ticker |
| 271 | property:label | Apple |
| 272 | property:label | NVIDIA |
| 273 | property:label | Microsoft |
| 274 | property:label | Tesla |
| 279 | property:label | Period |
| 281 | message-or-constant | 1M |
| 282 | property:placeholder | Select a period |
| 284 | message-or-constant | 1W |
| 284 | property:label | 1 week |
| 285 | message-or-constant | 1M |
| 285 | property:label | 1 month |
| 286 | message-or-constant | 1Y |
| 286 | property:label | 1 year |
| 287 | message-or-constant | 5Y |
| 287 | property:label | 5 years |
| 288 | message-or-constant | ALL |
| 288 | property:label | All available history |
| 296 | property:name | Ollama |
| 301 | property:name | Ollama Chat |
| 307 | property:label | Ollama Model |

## frontend/src/features/widgets/lib/widgets.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 52 | property:title | Weather |
| 56 | property:title | Weather |
| 60 | property:title | Weather |
| 64 | property:title | Weather |
| 68 | property:title | GitHub - Repository Stats |
| 74 | property:title | GitHub - Latest Commits |
| 80 | property:title | GitHub - User Profile |
| 86 | property:title | YouTube Video |
| 92 | property:title | YouTube Watch |
| 98 | property:title | Crypto Price |
| 102 | property:title | Stock Market |
| 108 | property:title | Stock Profile |
| 114 | property:title | Crypto Market |
| 120 | property:title | Ollama |
| 141 | template | Ollama - ${widget.params.model} |

## frontend/src/lib/apiClient.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 38 | message-or-constant | Retry-After |
| 41 | template | Request failed with status ${response.status} |

## frontend/src/lib/auth.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 24 | message-or-constant | Une erreur est survenue. |
| 68 | message-or-constant | Not signed in |

## frontend/src/lib/theme.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 22 | message-or-constant | useTheme must be used within a ThemeProvider |

## frontend/src/pages/AdminPage.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 22 | property:label | Utilisateurs |
| 23 | property:label | Administrateurs |
| 24 | property:label | Bannis |
| 30 | message-or-constant | L’action a échoué. Réessayez. |
| 36 | template | Nommer ${label} administrateur ? Cette personne pourra gérer tous les comptes. |
| 38 | template | Retirer le rôle administrateur à ${label} ? |
| 40 | template | Déconnecter ${label} de tous ses appareils ? |
| 42 | template | Supprimer définitivement le compte de ${label}, ses widgets et ses services connectés ? Cette action est irréversible. |
| 52 | jsx | Vous |
| 54 | jsx | Admin |
| 64 | template | Banni jusqu’au ${dateFormat.format(user.banExpires)} |
| 65 | jsx-expression | Banni |
| 69 | jsx | E-mail non vérifié |
| 129 | jsx | Administration |
| 130 | jsx | Gérez les comptes : rôles, bannissements, sessions et suppression. |
| 168 | attribute:aria-label | Rechercher par adresse e-mail |
| 169 | attribute:placeholder | Rechercher par e-mail |
| 189 | jsx | Utilisateur |
| 192 | jsx | Statut |
| 195 | jsx | Inscription |
| 199 | jsx | Actions |
| 243 | jsx | Aucun compte trouvé. |
| 249 | jsx | compte |
| 255 | attribute:aria-label | Page précédente |
| 261 | jsx | Page |
| 262 | jsx | / |
| 267 | attribute:aria-label | Page suivante |

## frontend/src/pages/AuthPage.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 20 | message-or-constant | Pour créer un compte avec GitHub, acceptez les conditions et confirmez avoir 16 ans ou plus, puis cliquez sur « Continuer avec GitHub ». |
| 22 | message-or-constant | Aucun compte n’est lié à ce compte GitHub. Créez-en un depuis l’onglet Inscription. |
| 24 | message-or-constant | Un compte existe déjà avec cet email. Connectez-vous avec votre mot de passe, puis liez GitHub depuis la page Services. |
| 25 | message-or-constant | Votre compte GitHub doit avoir une adresse email vérifiée. |
| 60 | property:name | displayName |
| 81 | message-or-constant | Une erreur est survenue. Réessayez plus tard. |
| 99 | jsx-expression | Vérifiez votre adresse e-mail |
| 101 | jsx-expression | Créer votre compte |
| 102 | jsx-expression | Bon retour parmi nous |
| 106 | jsx-expression | Une dernière étape avant d’accéder à votre dashboard. |
| 108 | jsx-expression | Créez un compte pour personnaliser votre dashboard. |
| 109 | jsx-expression | Connectez-vous pour retrouver votre dashboard. |
| 127 | jsx | Connexion |
| 138 | jsx | Inscription |
| 147 | jsx | Mot de passe modifié. Connectez-vous avec le nouveau. |
| 154 | jsx-expression | La connexion avec GitHub a échoué. Réessayez. |
| 165 | message-or-constant | Acceptez les conditions et confirmez avoir 16 ans ou plus avant de continuer avec GitHub. |
| 176 | message-or-constant | La connexion avec GitHub a échoué. Réessayez. |
| 181 | jsx | Continuer avec GitHub |
| 190 | jsx | Ou |
| 200 | jsx | Nom d’affichage |
| 201 | jsx | Facultatif |
| 211 | attribute:placeholder | Votre pseudo |
| 217 | jsx | Utilisé uniquement pour personnaliser votre espace. |
| 224 | jsx | Adresse e-mail |
| 230 | attribute:placeholder | vous@exemple.fr |
| 238 | jsx | Mot de passe |
| 243 | jsx | Mot de passe oublié ? |
| 264 | jsx | Entre 8 et 128 caractères. |
| 283 | jsx | J’accepte les |
| 290 | jsx | conditions générales d’utilisation |
| 292 | jsx | . |
| 307 | jsx | Je confirme avoir 16 ans ou plus. |
| 324 | jsx-expression | Chargement… |
| 326 | jsx-expression | Créer mon compte |
| 327 | jsx-expression | Se connecter |

## frontend/src/pages/ForgotPasswordPage.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 12 | message-or-constant | Une erreur est survenue. Réessayez plus tard. |
| 62 | jsx | Mot de passe oublié |
| 65 | jsx-expression | Saisissez le code reçu et choisissez un nouveau mot de passe. |
| 66 | jsx-expression | Nous vous enverrons un code pour choisir un nouveau mot de passe. |
| 72 | jsx | Si un compte utilise |
| 74 | jsx | , un code à 6 chiffres vient de lui être envoyé. Il expire dans 5 minutes. |
| 79 | jsx | Code reçu par e-mail |
| 91 | jsx | Nouveau mot de passe |
| 102 | jsx | Entre 8 et 128 caractères. Vos autres sessions seront déconnectées. |
| 113 | jsx-expression | Chargement… |
| 113 | jsx-expression | Changer le mot de passe |
| 119 | jsx | Adresse e-mail |
| 125 | attribute:placeholder | vous@exemple.fr |
| 135 | jsx-expression | Chargement… |
| 135 | jsx-expression | Recevoir un code |
| 143 | jsx | Retour à la connexion |

## frontend/src/pages/PrivacyPage.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 12 | jsx | Back |
| 17 | jsx | Privacy Policy (RGPD / GDPR) |
| 23 | jsx | Data Storage |
| 24 | jsx | We store the following user data: |
| 26 | jsx | Email address (for authentication and account recovery) |
| 27 | jsx | Password hashes (if not using OAuth) |
| 28 | jsx | Encrypted OAuth tokens (for connected services like GitHub) |
| 29 | jsx | Widget configurations (parameters and layouts) |
| 30 | jsx | Linked GitHub account ID (to preserve your login) |
| 35 | jsx | Data Usage |
| 37 | jsx | User data is used strictly to provide the dashboard features and widget functionalities. |
| 41 | jsx | OAuth tokens are used solely to fetch data for the connected services as configured by the user. |
| 45 | jsx | We do not sell your data. |
| 46 | jsx | YouTube widgets load thumbnails from i.ytimg.com and, when you click Play, the video player from youtube-nocookie.com. These requests send your IP address and browser information to Google / YouTube, under their privacy policy. |
| 52 | jsx | Administrators see each account's name, email, role, email verification, ban state and registration date, to manage accounts (role, ban, sign-out, deletion). They never see passwords, API keys, OAuth tokens or widget settings. |
| 62 | jsx | Profile and registration |
| 65 | jsx | You can edit your display name and email, including with a GitHub-only account. Your GitHub account ID keeps your login linked to the same Dashboard account after an email change. |
| 70 | jsx | New accounts require accepting the terms and confirming that you are at least 16, including when signing up with GitHub. This is a self-declaration; we do not collect or verify your birth date. |
| 78 | jsx | Your Rights (GDPR Compliance) |
| 83 | jsx | Right to Access |
| 83 | jsx | : "Download My Data" exports your profile, readable widget configurations and connected-service metadata. Password hashes, API keys and OAuth tokens are excluded. |
| 89 | jsx | Right to Erasure |
| 89 | jsx | : You can permanently delete your account, widgets and stored service credentials from the active database via "Delete My Account". This does not delete data held by external providers or retained backups. |
| 95 | jsx | Consent |
| 95 | jsx | : By registering, you accept our Terms of Service (CGU) and this Privacy Policy. |

## frontend/src/pages/ServicesPage.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 15 | message-or-constant | This GitHub account is already linked to another Dashboard account. |
| 21 | message-or-constant | Linking the account failed. Try again. |
| 52 | jsx | Services |
| 53 | jsx | Connect your own provider credentials before adding their widgets. |

## frontend/src/pages/TermsPage.tsx

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 8 | property:title | 1. Objet du service |
| 10 | message-or-constant | Dashboard permet de regrouper et d’organiser des widgets connectés à différents services. Ces conditions définissent les règles d’utilisation de la plateforme. |
| 13 | property:title | 2. Création du compte |
| 15 | message-or-constant | Vous devez fournir une adresse e-mail valide et protéger votre mot de passe. Le nom d’affichage est facultatif. Vous êtes responsable des actions réalisées depuis votre compte. |
| 18 | property:title | 3. Utilisation acceptable |
| 20 | message-or-constant | Vous vous engagez à ne pas détourner le service, tenter d’accéder aux comptes d’autres utilisateurs, perturber la plateforme ou utiliser les intégrations d’une manière contraire à leurs propres conditions. |
| 23 | property:title | 4. Données et confidentialité |
| 25 | message-or-constant | Les informations nécessaires au compte, aux préférences et aux widgets sont enregistrées afin de fournir le service. Les mots de passe sont stockés sous forme chiffrée par hachage et ne sont jamais conservés en clair. |
| 28 | property:title | 5. Services externes |
| 30 | message-or-constant | Certaines fonctionnalités reposent sur des services tiers. Leur disponibilité et le traitement des données qu’ils réalisent dépendent également de leurs propres règles et politiques. |
| 33 | property:title | 6. Disponibilité et responsabilité |
| 35 | message-or-constant | La plateforme peut évoluer, être interrompue pour maintenance ou rencontrer des indisponibilités. Aucun fonctionnement permanent ou sans erreur ne peut être garanti. |
| 38 | property:title | 7. Suppression du compte |
| 40 | message-or-constant | Vous pouvez demander la suppression de votre compte et des données qui lui sont associées. Les modalités de contact et d’exercice de ce droit seront précisées dans la politique de confidentialité. |
| 43 | property:title | 8. Évolution des conditions |
| 45 | message-or-constant | Ces conditions peuvent être mises à jour lorsque le service évolue. En cas de modification importante, une information claire sera présentée aux utilisateurs. |
| 57 | jsx | Dashboard |
| 61 | jsx | Retour à l’inscription |
| 70 | jsx | Conditions d’utilisation |
| 73 | jsx | Conditions générales d’utilisation |
| 76 | jsx | Ces conditions expliquent simplement les règles applicables lorsque vous créez un compte et utilisez Dashboard. |
| 80 | jsx | Dernière mise à jour : 17 septembre 2026 |
| 88 | jsx | Acceptation |
| 89 | jsx | En cochant la case lors de l’inscription, vous confirmez avoir lu et accepté les présentes conditions. Si vous ne les acceptez pas, vous ne devez pas créer de compte. |
| 111 | jsx | Vous avez terminé votre lecture ? |
| 112 | jsx | Revenez à l’inscription pour créer votre compte. |
| 116 | jsx | Retour à l’inscription |

## shared/src/index.ts

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 16 | message-or-constant | Invalid email address |
| 22 | message-or-constant | Password must be between 8 and 128 characters |
| 23 | message-or-constant | Password must be between 8 and 128 characters |
| 26 | property:name | Display name must be 50 characters or fewer |
| 30 | property:message | You must accept the CGU to register. |
| 33 | property:message | You must confirm you are 16 or older to register. |
| 39 | message-or-constant | Email and password required |
| 46 | property:name | Display name must be 50 characters or fewer |

## frontend/index.html

| Ligne | Origine | Texte actuel |
| --- | --- | --- |
| 2 | document-language | en |
| 7 | document-title | Dashboard |

## Formats à adapter à la langue sélectionnée

| Source | Expression actuelle |
| --- | --- |
| backend/src/controllers/services.ts:56 | connection.verifiedAt.toLocaleDateString() |
| frontend/src/features/widgets/catalog/CryptoChartWidget.tsx:97 | new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: value < 1 ? 6 : 2, }).format(value) |
| frontend/src/features/widgets/catalog/CryptoChartWidget.tsx:97 | new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: value < 1 ? 6 : 2, }) |
| frontend/src/features/widgets/catalog/CryptoChartWidget.tsx:103 | value.toLocaleString() |
| frontend/src/features/widgets/catalog/CryptoChartWidget.tsx:108 | new Intl.DateTimeFormat(undefined, { ...(days <= 1 ? { hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric' }), }).format(new Date(timestamp)) |
| frontend/src/features/widgets/catalog/CryptoChartWidget.tsx:108 | new Intl.DateTimeFormat(undefined, { ...(days <= 1 ? { hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric' }), }) |
| frontend/src/features/widgets/catalog/CryptoChartWidget.tsx:121 | points .map((point, index) => { const x = MARGIN.left + ((point.timestamp - bounds.minTime) / timeRange) * plotWidth; const y = MARGIN.top + (1 - (point.change - bounds.minValue) / valueRange) * plotHeight; return &#96;${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}&#96;; }) .join(' ') |
| frontend/src/features/widgets/catalog/CryptoChartWidget.tsx:125 | x.toFixed(2) |
| frontend/src/features/widgets/catalog/CryptoChartWidget.tsx:125 | y.toFixed(2) |
| frontend/src/features/widgets/catalog/CryptoChartWidget.tsx:216 | Math.abs(change).toFixed(2) |
| frontend/src/features/widgets/catalog/CryptoChartWidget.tsx:304 | tick.toFixed(0) |
| frontend/src/features/widgets/catalog/CryptoPrice.tsx:17 | new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase(), notation: compact ? 'compact' : 'standard', maximumFractionDigits: compact ? 2 : value < 1 ? 6 : 2, }).format(value) |
| frontend/src/features/widgets/catalog/CryptoPrice.tsx:17 | new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase(), notation: compact ? 'compact' : 'standard', maximumFractionDigits: compact ? 2 : value < 1 ? 6 : 2, }) |
| frontend/src/features/widgets/catalog/CryptoPrice.tsx:24 | value.toLocaleString() |
| frontend/src/features/widgets/catalog/CryptoPrice.tsx:51 | change.toFixed(2) |
| frontend/src/features/widgets/catalog/GithubWidgets.tsx:150 | new Date(commit.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', }) |
| frontend/src/features/widgets/catalog/StockMarketWidget.tsx:85 | new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: value < 1 ? 4 : 2, }).format(value) |
| frontend/src/features/widgets/catalog/StockMarketWidget.tsx:85 | new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: value < 1 ? 4 : 2, }) |
| frontend/src/features/widgets/catalog/StockMarketWidget.tsx:91 | value.toLocaleString() |
| frontend/src/features/widgets/catalog/StockMarketWidget.tsx:105 | new Intl.DateTimeFormat(undefined, options).format(date) |
| frontend/src/features/widgets/catalog/StockMarketWidget.tsx:105 | new Intl.DateTimeFormat(undefined, options) |
| frontend/src/features/widgets/catalog/StockMarketWidget.tsx:114 | points .map((point, index) => { const x = MARGIN.left + ((point.timestamp - bounds.minTime) / timeRange) * plotWidth; const y = MARGIN.top + (1 - (point.change - bounds.minValue) / valueRange) * plotHeight; return &#96;${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}&#96;; }) .join(' ') |
| frontend/src/features/widgets/catalog/StockMarketWidget.tsx:118 | x.toFixed(2) |
| frontend/src/features/widgets/catalog/StockMarketWidget.tsx:118 | y.toFixed(2) |
| frontend/src/features/widgets/catalog/StockMarketWidget.tsx:223 | Math.abs(change).toFixed(2) |
| frontend/src/features/widgets/catalog/StockMarketWidget.tsx:310 | tick.toFixed(0) |
| frontend/src/features/widgets/catalog/StockProfileWidget.tsx:13 | new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: value < 1 ? 4 : 2, }).format(value) |
| frontend/src/features/widgets/catalog/StockProfileWidget.tsx:13 | new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: value < 1 ? 4 : 2, }) |
| frontend/src/features/widgets/catalog/StockProfileWidget.tsx:19 | value.toFixed(2) |
| frontend/src/features/widgets/catalog/StockProfileWidget.tsx:25 | value.toFixed(2) |
| frontend/src/features/widgets/catalog/StockProfileWidget.tsx:30 | new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', }).format(timestamp) |
| frontend/src/features/widgets/catalog/StockProfileWidget.tsx:30 | new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', }) |
| frontend/src/features/widgets/catalog/StockProfileWidget.tsx:66 | points .map( (point, index) => &#96;${index ? 'L' : 'M'} ${x(point.timestamp).toFixed(2)} ${y(point.price).toFixed(2)}&#96;, ) .join(' ') |
| frontend/src/features/widgets/catalog/StockProfileWidget.tsx:69 | x(point.timestamp).toFixed(2) |
| frontend/src/features/widgets/catalog/StockProfileWidget.tsx:69 | y(point.price).toFixed(2) |
| frontend/src/features/widgets/catalog/WeatherWidgets.tsx:76 | new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format( new Date(&#96;${day.date}T12:00:00&#96;), ) |
| frontend/src/features/widgets/catalog/WeatherWidgets.tsx:76 | new Intl.DateTimeFormat(undefined, { weekday: 'short' }) |
| frontend/src/features/widgets/catalog/YouTubeWatchWidget.tsx:180 | new Date(video.publishedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', }) |
| frontend/src/pages/AdminPage.tsx:27 | new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }) |
