# Accessibility

Target: **WCAG 2.2 level AA** on every page, checked automatically (axe, Lighthouse) and by hand
(keyboard, screen reader).

## Accessibility settings

The accessibility button (person icon) sits in the navigation bar, and next to the language
switch on public pages. Settings are saved in the browser (`localStorage`,
`dashboard-accessibility`) and applied before the first render, so the page never shows with the
defaults first. Code: `frontend/src/lib/accessibility.ts`, `components/AccessibilityMenu.tsx`,
rules at the end of `index.css`.

| Setting            | Effect                                                                                   | WCAG                 |
| ------------------ | ---------------------------------------------------------------------------------------- | -------------------- |
| Text size          | 100 / 125 / 150 / 200 %. Sets the `<html>` font size: every size in the app is in `rem`. | 1.4.4 Resize text    |
| High contrast      | Darker secondary text, solid borders, 3 px focus outline (light and dark themes).        | 1.4.3, 1.4.11, 2.4.7 |
| Animations         | Follow the device ("reduce motion"), always reduce, or allow.                            | 2.3.3                |
| Underline links    | Every link underlined, not only on hover.                                                | 1.4.1 Use of color   |
| Wider text spacing | Line height 1.5, letter spacing 0.12 em, word spacing 0.16 em, paragraph spacing 2 em.   | 1.4.12 Text spacing  |
| Easy-to-read font  | Atkinson Hyperlegible (designed for low vision), bundled with the app.                   | —                    |

The dashboard grid's row height follows the text size, so enlarged text still fits its widget.

## Keyboard

Everything works without a mouse. Focus is always visible (focus ring, stronger in high contrast).

| Where          | Keys                                                                                  |
| -------------- | ------------------------------------------------------------------------------------- |
| Any page       | `Tab` / `Shift+Tab` move between controls; the first `Tab` shows **Skip to content**. |
| Dialogs, menus | `Esc` closes them; focus returns to the button that opened them; focus stays inside.  |
| Widget         | Focus its **move** button (four arrows): arrows move it, `Shift` + arrows resize it.  |
| Selects        | Arrows choose, `Enter` confirms, typing a letter jumps to the matching option.        |

Each widget move or resize is saved at once and announced to screen readers ("Weather moved to
column 2.").

## Screen readers

- **Structure**: one `<h1>` per page, widget titles are `<h2>`; landmarks `<nav>` and `<main>`.
- **Page titles**: each page has its own title ("Services · Dashboard"), read when the page
  changes.
- **Labels**: every icon-only button has a name ("Configure Weather", "Move or resize Weather");
  every form field has a `<label>`; help texts are linked with `aria-describedby`.
- **Live regions**: errors use `role="alert"`, loading and state changes `role="status"`
  (widget refresh, retries, keyboard moves).
- **Images**: decorative images have `alt=""`; logos and charts have a text name.
- **Language**: `<html lang>` follows the chosen language (FR/EN), so the voice reads the right
  language.

## Contrast

Text meets **4.5:1** (normal text) and **3:1** (large text, borders, focus ring) in the light and
dark themes; high contrast goes further. axe checks it on every e2e run, including at 200 % text
with high contrast on.

## How it is checked

| Check                                                                                | Where                                                                                         |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| axe on login, register, CGU, privacy, dashboard (light, dark, 200 % + high contrast) | `e2e/tests/a11y.spec.ts`, `dashboard-accessibility.spec.ts`, `accessibility-settings.spec.ts` |
| Keyboard: skip link, focus return, widget move saved after reload                    | `e2e/tests/accessibility-settings.spec.ts`                                                    |
| Settings applied, saved, reset; menu labels                                          | `frontend/src/lib/accessibility.test.ts`, `components/AccessibilityMenu.test.tsx`             |
| Lighthouse accessibility ≥ 95 on every CI run                                        | `lighthouse` job, see [lighthouse.md](lighthouse.md)                                          |

### Manual test (before each release and the defense)

Keyboard only, mouse unplugged:

1. Sign in, then `Tab` from the top: **Skip to content** appears and jumps to the page.
2. Open **Add Widget**, add a widget, close the dialog with `Esc`: focus returns to the button.
3. Focus a widget's move button: arrows move it, `Shift` + arrows resize it; reload, it stayed.
4. Open the account menu with `Enter`, go through it with the arrows, close it with `Esc`.
5. Accessibility menu: 200 % text and high contrast; every page still readable without
   horizontal scrolling.

Screen reader (NVDA on Windows, VoiceOver on macOS, Orca on Linux):

1. Each page announces its title; the headings list (`H` key) shows the page and widget titles.
2. Every button is read with a name; no "button" alone.
3. A wrong password is read at once (alert); a widget refresh error too.
4. Moving a widget with the keyboard is announced.
