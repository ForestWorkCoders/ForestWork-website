# 林間小鎮 ForestWork — Brand Guidelines

The same rules as the brand centre at https://forestwork.vercel.app/brand.

## 1. Colour (色彩)

| Token | HEX | Use |
|---|---|---|
| Forest Emerald 森林墨綠 (primary) | `#4C7766` | Primary buttons, links, focus rings |
| Amber Gold 琥珀金 (secondary) | `#D97706` | Highlights: champions, live, eyebrow labels |
| Crisp White 雪白 | `#FFFFFF` | Light-mode cards, background behind the black logo, print white |
| Mist White 霧白 | `#F7F9FC` | Light page background (softer than pure white) |
| Cool Grey 冷灰 | `#C9D1D9` | Borders, disabled controls, body text in dark mode |
| Charcoal Black 炭黑 | `#231F20` | Background behind the white logo; print black. Not a page colour |
| Ink Black 墨黑 | `#0D1117` | Dark page background |

- Light mode: page `#F7F9FC`, cards `#FFFFFF`, borders `slate-200`.
- Dark mode: page `#0D1117`, cards `#161B22`, borders `#30363D`.
- Neutral greys use a cool scale (Tailwind `slate`) to match Ink Black.
- Status colours are not brand colours. Gains (rank up, positive points, promoted) use Nuxt UI `success` (green); losses, negative points and errors use `error` (red); other states may use blue and purple. Final-leaderboard medals keep gold, silver and bronze.
- Game pages may keep their own accent colour, but use the brand typefaces, sizes, logo rules, language and dark background.

## 2. Typeface (字型)

- **Sans:** `'Open Sans', 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', system-ui, sans-serif`. Latin in Open Sans; Chinese in the system's Traditional Chinese font.
- **Mono:** `'JetBrains Mono', ui-monospace, monospace`. Use it for scores, stats, codes and eyebrow labels.
- Open Sans goes up to weight 800 (ExtraBold). Don't use 900.

## 3. Size (字級)

- Body text and paragraphs: **14px minimum** (`text-sm`).
- Labels, table cells, metadata and badges: **12px** (`text-xs`) allowed.
- **Nothing below 12px** on screen. Print: 10pt minimum.
- **At most 3 font sizes in one card or section**, headings included.

## 4. Spacing (間距)

- The gap below a heading is **at least the heading's font size**, e.g. `text-2xl` (24px) → `mt-6`.
- Between paragraphs: **1.5×** the line gap (`space-y-3` to `space-y-4` for `text-sm`).
- Between sections: one rhythm per page (`space-y-16` to `space-y-20`).
- Line length: cap paragraphs at `max-w-prose` (about 30–45 Chinese or 60–75 Latin characters per line). Don't stretch text to the container width. Text inside cards and tables follows the card.
- Alignment: Chinese paragraphs are justified (`text-justify`), so inline codes such as `#161B22` don't leave a ragged right edge. Narrow cards (under about 20 characters per line) stay left-aligned, because justifying them spreads the characters too far. Several separate rules go in a list, not one paragraph.

## 5. Logo (標誌)

Files are named by the colour of the artwork, not the background.

- **Emblem 圖案標**: `svg/logo-black.svg` / `svg/logo-white.svg`
- **EN logotype 英文字標**: `svg/text-en-black.svg` / `svg/text-en-white.svg` (viewBox `0 0 266 36`)
- **ZH logotype 中文字標**: `svg/text-zh-black.svg` / `svg/text-zh-white.svg` (viewBox `0 0 400 90`)

| Use | Minimum height |
|---|---|
| Header | Emblem 20px (`h-5`), the same height as the header icons; logotype 14px (`h-3.5`) |
| Horizontal lockup 橫向組合 | 45px |
| Vertical lockup 直向組合 | 75px. The parts keep the master proportion: ZH ≈ 0.26 × emblem height, EN ≈ 0.3 × ZH height |
| Emblem alone 純圖案 | 24px |

- Black artwork on light backgrounds (`#FFFFFF`, `#F7F9FC`); white artwork on dark ones (`#0D1117`, `#161B22`, `#231F20`, Forest Emerald, dark photos).
- Keep clear space of **0.25×** the emblem height on every side.
- Inside a lockup, the EN logotype keeps the lockup proportion and is never enlarged on its own. The 14px logotype minimum applies to a standalone or header logotype.
- Don't stretch, recolour, rotate, outline or add shadows; don't change the viewBox; don't place the logo on busy, low-contrast images.

## 6. Language (語言)

- **Traditional Chinese with Taiwan wording** (zh-Hant-TW) everywhere, including page titles and share descriptions.
- **One term per stat** across pages: 默聽率, 流局聽牌率, 平均和牌巡數.
- Bilingual labels such as 「玩家數據 · Player Stats」 are fine.
