# Lighthouse results

Lighthouse (Google's audit tool) scores a page from 0 to 100 on performance, accessibility, best
practices and SEO. CI runs it on every pull request and push to `main` (`lighthouse` job) and
**fails under 95** in any category.

## Latest results

Run on 2026-10-10, Lighthouse 12.6.1, desktop profile (1200 × 900), 3 runs, commit of the
accessibility settings (`feat/a11y`).

| Category       | Run 1 | Run 2 | Run 3 | Required                    |
| -------------- | ----: | ----: | ----: | --------------------------- |
| Performance    |    98 |    98 |    97 | median ≥ 95                 |
| Accessibility  |   100 |   100 |   100 | every run ≥ 95              |
| Best practices |   100 |   100 |   100 | every run ≥ 95              |
| SEO            |   100 |   100 |   100 | every run ≥ 95              |

| Metric                         | Value  | Good under | Meaning                                    |
| ------------------------------ | -----: | ---------: | ------------------------------------------ |
| First Contentful Paint (FCP)   | 0.6 s  |      1.8 s | First text or image on screen              |
| Largest Contentful Paint (LCP) | 1.1 s  |      2.5 s | Main content visible                       |
| Total Blocking Time (TBT)      | 10 ms  |     200 ms | Time the page cannot react to a click      |
| Cumulative Layout Shift (CLS)  | 0      |        0.1 | How much the page jumps while loading      |
| Speed Index                    | 1.1 s  |      3.4 s | How fast the page looks complete           |

## What is measured

The signed-in dashboard with five widgets (crypto chart, stock chart, YouTube player, YouTube
channel watch, chatbot) and fixed data, served by the production build (`e2e/lighthouse/server.mjs`). Fixed data keeps
the scores stable: they measure our frontend, not how fast OpenWeather or CoinGecko answer.

## What got the scores there

- **Performance**: widget code and dialogs load only when needed (`lazy`), the main font is
  preloaded, YouTube players load on click, no layout jumps (fixed widget sizes).
- **Accessibility**: see [accessibility.md](accessibility.md).
- **Best practices**: Content-Security-Policy, no console errors, images at the right size,
  YouTube through `youtube-nocookie.com`.
- **SEO**: page `description`, `lang` on `<html>`, `robots.txt`, one title per page.

## Run it yourself

```bash
npm run lighthouse
```

Reports are written to `lighthouse-reports/` (one HTML file per run, open it in a browser). On
GitHub, each CI run keeps them 7 days in the `lighthouse-reports` artifact.
