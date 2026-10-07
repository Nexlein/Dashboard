import { test, expect, type Page } from '@playwright/test';

async function mockBackend(page: Page) {
    await page.route('http://localhost:8080/**', async (route) => {
        const { pathname } = new URL(route.request().url());
        const widget = {
            id: 1,
            serviceName: 'weather',
            widgetName: 'current_weather',
            params: { city: 'Paris' },
            refreshRate: 600,
            layout: { x: 0, y: 0, w: 4, h: 3 },
        };
        const body =
            pathname === '/api/auth/get-session'
                ? {
                      user: { id: '42', email: 'ada@example.com', name: 'Ada', role: 'admin' },
                      session: { id: 'session', userId: '42' },
                  }
                : pathname === '/widgets'
                  ? [widget]
                  : pathname === '/widgets/1/data'
                    ? {
                          location: { name: 'Paris', country: 'FR' },
                          temperature: 19,
                          feelsLike: 18,
                          humidity: 70,
                          windSpeed: 3.2,
                          conditionCode: 800,
                          condition: 'clear sky',
                          icon: '01d',
                      }
                    : pathname === '/services'
                      ? [
                            {
                                name: 'weather',
                                displayName: 'OpenWeather',
                                description: 'Connected on 10/6/2026',
                                configurable: true,
                                connected: true,
                                connectionType: 'apiKey',
                                keyHint: 'a1b2',
                                verifiedAt: '2026-10-06T12:00:00Z',
                            },
                            {
                                name: 'crypto',
                                displayName: 'CoinGecko',
                                configurable: true,
                                connected: true,
                                connectionType: 'apiKey',
                                keyHint: 'c3d4',
                            },
                            {
                                name: 'youtube',
                                displayName: 'YouTube',
                                configurable: true,
                                connected: true,
                                connectionType: 'apiKey',
                                keyHint: 'e5f6',
                            },
                        ]
                      : pathname === '/api/auth/admin/list-users'
                        ? {
                              users: [
                                  {
                                      id: '42',
                                      email: 'ada@example.com',
                                      name: 'Ada',
                                      role: 'admin',
                                      emailVerified: true,
                                      banned: false,
                                      createdAt: '2026-10-06T12:00:00Z',
                                  },
                              ],
                              total: 1,
                              limit: 20,
                              offset: 0,
                          }
                        : pathname === '/about.json'
                          ? {
                                client: { host: '127.0.0.1' },
                                server: { current_time: 1, services: [] },
                            }
                          : {};
        await route.fulfill({ json: body });
    });
}

test('switches language, preserves a registration draft and remembers the choice after reload', async ({
    page,
}) => {
    await page.goto('/register');
    await page.getByLabel('Email address').fill('ada@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Secret123');
    await page.getByLabel(/Terms of Service/).check();
    await page.getByRole('button', { name: 'Français', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        /tableau de bord/,
    );
    await expect(page.getByLabel('Adresse e-mail')).toHaveValue('ada@example.com');
    await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveValue('Secret123');
    await expect(page.getByLabel(/conditions générales/)).toBeChecked();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Créer mon compte' })).toBeVisible();
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        /customizable dashboard/,
    );
    await expect(page.getByRole('button', { name: 'Create my account' })).toBeVisible();
});

for (const language of ['en', 'fr'] as const) {
    for (const width of [1440, 390]) {
        test(`${language}, ${width}px: core routes are localized and fit the viewport`, async ({
            page,
        }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.addInitScript((lang) => {
                localStorage.setItem('dashboard-language', lang);
                localStorage.setItem('cookie-consent', 'declined');
            }, language);
            await mockBackend(page);
            const headings =
                language === 'fr'
                    ? [
                          ['/login', 'Bon retour parmi nous'],
                          ['/register', 'Créer votre compte'],
                          ['/forgot-password', 'Mot de passe oublié'],
                          ['/privacy', 'Politique de confidentialité (RGPD / GDPR)'],
                          ['/cgu', 'Conditions générales d’utilisation'],
                          ['/', 'Tableau de bord'],
                          ['/services', 'Services'],
                          ['/admin', 'Administration'],
                      ]
                    : [
                          ['/login', 'Welcome back'],
                          ['/register', 'Create your account'],
                          ['/forgot-password', 'Forgot password'],
                          ['/privacy', 'Privacy Policy (RGPD / GDPR)'],
                          ['/cgu', 'Terms of Service'],
                          ['/', 'Dashboard'],
                          ['/services', 'Services'],
                          ['/admin', 'Administration'],
                      ];
            for (const [path, title] of headings) {
                await page.goto(path);
                await expect(page.getByRole('heading', { name: title })).toBeAttached();
                await expect(page.locator('html')).toHaveAttribute('lang', language);
                const authenticated = ['/', '/services', '/admin'].includes(path);
                if (authenticated) {
                    await expect(
                        page.getByRole('button', { name: 'Français', exact: true }),
                    ).toHaveCount(0);
                    await expect(
                        page.getByRole('group', {
                            name: language === 'fr' ? 'Thème' : 'Theme',
                            exact: true,
                        }),
                    ).toBeVisible();
                    await page
                        .getByRole('button', { name: /(?:menu du compte|account menu)/ })
                        .click();
                }
                await expect(
                    page.getByRole('group', {
                        name: language === 'fr' ? 'Langue' : 'Language',
                        exact: true,
                    }),
                ).toBeVisible();
                if (authenticated) {
                    const choice = page.getByRole('menuitemradio', {
                        name: language === 'fr' ? 'Français' : 'English',
                        exact: true,
                    });
                    await expect(choice).toHaveAttribute('aria-checked', 'true');
                    if (path === '/') {
                        const otherChoice = page.getByRole('menuitemradio', {
                            name: language === 'fr' ? 'English' : 'Français',
                            exact: true,
                        });
                        await otherChoice.focus();
                        await otherChoice.press('Enter');
                        await expect(page.locator('html')).toHaveAttribute(
                            'lang',
                            language === 'fr' ? 'en' : 'fr',
                        );
                        await expect(otherChoice).toHaveAttribute('aria-checked', 'true');
                        await choice.focus();
                        await choice.press('Enter');
                        await expect(page.locator('html')).toHaveAttribute('lang', language);
                    }
                    if (path === '/' && language === 'fr' && width === 390) {
                        await page.screenshot({
                            path: test.info().outputPath('account-menu-fr-mobile.png'),
                            animations: 'disabled',
                        });
                    }
                    await page.keyboard.press('Escape');
                    await expect(page.getByRole('menu')).toBeHidden();
                }
                if (path === '/') {
                    const addWidget = page.getByRole('button', {
                        name: language === 'fr' ? 'Ajouter un widget' : 'Add Widget',
                        exact: true,
                    });
                    const account = page.getByRole('button', {
                        name: /(?:menu du compte|account menu)/,
                    });
                    const themeSwitch = page.getByRole('group', {
                        name: language === 'fr' ? 'Thème' : 'Theme',
                        exact: true,
                    });
                    const heights = await Promise.all(
                        [addWidget, account, themeSwitch].map((control) =>
                            control.evaluate((element) => element.getBoundingClientRect().height),
                        ),
                    );
                    expect(heights[0]).toBe(heights[1]);
                    expect(heights[0]).toBe(heights[2]);
                    await page
                        .getByRole('button', {
                            name: language === 'fr' ? 'Thème sombre' : 'Dark theme',
                            exact: true,
                        })
                        .click();
                    await expect(page.locator('html')).toHaveClass(/dark/);
                    await page.reload();
                    await expect(page.locator('html')).toHaveClass(/dark/);
                    await page
                        .getByRole('button', {
                            name: language === 'fr' ? 'Thème clair' : 'Light theme',
                            exact: true,
                        })
                        .click();
                    await expect(page.locator('html')).not.toHaveClass(/dark/);
                }
                const overflow = await page.evaluate(
                    () => document.documentElement.scrollWidth > window.innerWidth,
                );
                expect(overflow, `${path} overflows at ${width}px`).toBe(false);
                if (path === '/services') {
                    for (const brand of ['CoinGecko', 'YouTube']) {
                        const logo = page.getByRole('img', {
                            name: language === 'fr' ? `Logo ${brand}` : `${brand} logo`,
                            exact: true,
                        });
                        await expect(logo).toBeVisible();
                        await expect(logo).toHaveAttribute(
                            'src',
                            `/logos/${brand.toLowerCase()}.svg`,
                        );
                        await expect
                            .poll(() =>
                                logo.evaluate(
                                    (image: HTMLImageElement) =>
                                        image.complete && image.naturalWidth > 0,
                                ),
                            )
                            .toBe(true);
                    }
                }
                if (
                    language === 'fr' &&
                    width === 390 &&
                    ['/register', '/services'].includes(path)
                ) {
                    await page.screenshot({
                        path: test.info().outputPath(`${path.slice(1)}-fr-mobile.png`),
                        fullPage: true,
                    });
                }
            }
        });
    }
}
