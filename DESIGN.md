---
name: Teman Kost (AI-Waifu)
description: A warm, lamplit visual-novel room where Livia lives and the productivity tools quietly earn their keep.
colors:
  primary: "#ff758c"
  primary-deep: "#ff0844"
  primary-soft: "#ff9a9e"
  secondary: "#8b6f5e"
  neutral-bg: "#fdfbf7"
  neutral-panel: "#ffffff"
  neutral-text: "#5c4d47"
  neutral-muted: "#7a7268"
  neutral-border: "#f0e4de"
  amber-coin: "#f59e0b"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "0.02em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "DM Mono, monospace"
    fontWeight: 700
    letterSpacing: "0.18em"
rounded:
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "16px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
  badge-pill:
    backgroundColor: "{colors.neutral-panel}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "6px 14px"
  input-field:
    backgroundColor: "#fdf6f0"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
---
# Design System: Teman Kost (AI-Waifu)

## Overview

**Creative North Star: "The Lamplit Room"**

Teman Kost is the room you come home to — warm, lived-in, and quietly sincere. The entire interface behaves like furniture and fixtures in Livia's shared kos (boarding house): cream paper walls, panels of frosted glass catching the evening lamplight, and one hot-pink glow — the lamp — that is always present but never floods the space. The romance of a visual-novel heroine and the trust of a productivity companion share the same thermostat.

The room is *warm*, not loud. The canvas is a soft paper cream (`#fdfbf7`), surfaces are white glassy cards with generous rounded corners (`16–32px`), and the accent is a single pink lamp-glow family (`#ff758c → #ff0844`) reserved for the things that matter: Livia's nameplate, primary actions, the affectionate state, and key live feedback. Type does the emotional work: a high-contrast serif display face (Cormorant Garamond) carries titles and dialogue in a storybook voice, while a calm geometric sans (DM Sans) keeps long text readable and a small mono face (DM Mono) whispers the "tactical" HUD layer — a playful veneer of `SYSTEM.STATUS` labels, corner brackets, and tabular readouts that frames the room as a cosy game of *life with Livia*, never a technical dashboard. Deliberate, gentle animation (float, bounce, pop, pulse) sells the living character; nothing is allowed to feel sterile or industrial.

**Key Characteristics:**
- Cream-paper light background (`#fdfbf7`) with frosted white glass panels (`backdrop-blur` + translucent white, border `#fff`/pink tint).
- One hot-pink accent family (`#ff758c → #ff0844`); used sparingly, always meaningful.
- Serif display (Cormorant Garamond) for titles, dialogue, and emotional copy; DM Sans body; DM Mono for HUD/labels/numbers.
- Rounded, pill, and asymmetric "bubble" silhouettes; no sharp corners except deliberate tactical framing (landing corner brackets, skewed job cards).
- Soft ambient shadows with a pink blush under accent elements; flat surfaces otherwise.
- VN game grammar: choice pills, dialogue boxes, typewriter text, affection bars, level badges, sprite glows keyed to emotion.

## Colors

A single-source living system: warm cream canvas, hot-pink lamp accent, and a neutral family that leans warm. (Dark CSS variables in `app/globals.css` — `--background: #0f0e0d` etc. — are an unused legacy remnant; no page renders on them. Do not build dark UI from them.)

### Primary
- **Lamp Pink** (`#ff758c`): The accent. Used for the primary gradient (with Lamp Crimson below), active nav states, Livia's nameplate/avatar gradients, link hovers, focus rings, live badges, and the affection/life gradient. It is the lamp in the room — visible, warm, but never covering more than ~10% of any screen.
- **Lamp Crimson** (`#ff0844`): The deep end of the lamp gradient (`from-[#ff758c] to-[#ff0844]`). Used for the secondary edge of gradient buttons, the navigation progress bar, the work-page header band, and special CTA cards. Never used alone; always paired as the gradient's darker stop.
- **Lamp Soft** (`#ff9a9e`): The blush end. Used for decorative radial glows, loading dots, dialogue "next" indicators, and the softer greeting-state bubbles. Ambient, never a text color.
- **Lamp Secondary** (`#8b6f5e`): A dusty umber-mauve reserved as a supporting accent in rare secondary contexts (e.g., wardrobe/secondary surfaces). Reserved; the system mostly lives on the three above.

### Neutral
- **Paper Cream** (`#fdfbf7`): The canvas. Every app surface sits on it. Also the fallback background behind story sprites and the landing backdrop.
- **Panel White** (`#ffffff`): Glassy surfaces — cards, modals, dialogue boxes, message bubbles, stat islands. Almost always used with `backdrop-blur` and a soft white/pink border.
- **Ink Cocoa** (`#5c4d47`): The dominant text color — titles, body, dialogue text. Warm brown, never pure black.
- **Muted Cocoa** (`#7a7268`): Secondary text, captions, placeholder-adjacent labels.
- **Warm Border** (`#f0e4de`): Hairline borders, dividers, card edges that are not white. Approximated in code by `border-gray-100`, `border-pink-100`, and `border-orange-100` at low opacity.
- **Coin Amber** (`#f59e0b`): Money (Rv), XP, gold-tier rewards, achievement accents. The one strict complement; belongs to the economy.

### Named Rules
**The Lamp-Glow Rule.** The primary pink is reserved for what the resident cares about — her voice, your bond, one decisive action per screen. On any given screen, pink covers ≤10% of the area; everything else is paper, glass, and warm neutrals. Pink's rarity is its meaning.

**The One Voice Rule.** Neutral and text colors always carry a warm undertone. Cool grays and blue-gray surfaces are never used for chrome; when they appear (crisis panel, call screen), they are deliberate semantic exceptions, not decoration.

**The Pink-Awareness Rule.** In HUD numerals and tabular readouts, mono text on pink (badges, timers, money pills) is white; never place low-contrast gray on pink.

## Typography

**Display Font:** Cormorant Garamond (fallback Georgia, serif) — weights 300–900, loaded at 300/400 + italics, used at 900 (black) in practice.
**Body Font:** DM Sans (fallback sans-serif) — weights 300–500.
**Label/Mono Font:** DM Mono (fallback monospace) — weights 300–400, used bold.

**Character:** A warm, storybook pairing — the serif is a dramatic, affectionate narrator; the sans is a calm, trustworthy roommate; the mono is a playful console that keeps score. Together: a visual novel that happens to be productive.

### Hierarchy
- **Display** (900, `text-4xl`–`text-6xl` / clamp 2.25–3.75rem, line-height ~1): The product name, hero titles, chapter titles. Uppercase + wide tracking (`tracking-widest`) for brand moments; normal case for affectionate copy.
- **Headline** (900, `text-2xl`–`text-3xl`): Section and modal titles (`"Menu Lainnya"`, `"Afeksi"`), dialogue nameplates.
- **Title** (700–900, `text-lg`–`text-xl`): Card titles, nav labels, feedback labels.
- **Body** (500, `text-sm`–`text-base`, line-height 1.5–1.6): Dialogue, descriptions, messages. Keep conversational lines to ~60–70ch.
- **Label** (700, `text-[9px]`–`text-xs`, `tracking-widest`, uppercase): The mono HUD layer — `SYSTEM.STATUS`, `[ SIGN UP ]`, stat labels, time/money readouts, badges. Never set body copy in mono.

### Named Rules
**The HUD Rule.** DM Mono is for garnish and data, never for sentences. A paragraph in mono breaks the room's warmth; a pill that says `0 / 100` in mono is the point.

## Layout

The app is a full-viewport "room" on mobile and a centered stage on desktop. The home screen centers Livia's sprite with floating HUD islands over it; every other screen is a full-bleed `min-h-[100dvh]` panel with a sticky header.

- **Canvas:** `#fdfbf7` everywhere; content is never boxed in a global container — surfaces float as individual glass cards.
- **Container width:** Cards cap around `max-w-sm` (24rem) to `max-w-5xl` (64rem); dialogue boxes top out at `max-w-4xl`–`max-w-5xl`.
- **Spacing rhythm:** 8px base → 16 → 24 → 32px gaps (`gap-2/4/6/8`, `p-4/5/6/8`). Cards use `p-4`/`p-6` internally; stacked content uses 12–24px gaps.
- **Density:** Medium and airy. Optional dense rows (stats, nav icons) use small text (7–10px) with tight `tracking-widest` labels rather than cramming.
- **Responsive:** Mobile = bottom navigation bar (`rounded-[2rem]` glass pill) and bottom-anchored stat modals; desktop = side/top HUD islands and wide panel layouts. Breakpoints are Tailwind defaults (`md` 768px). Story scenes scale with `landscape:` variants.
- **Signature compositions:** The landing page frames the room with corner brackets + hairline grid; the work page uses a skewed header band and a skewed selected-job card; story mode is a full-bleed scene with a bottom dialogue box.

## Elevation & Depth

Depth is layered, not heavy. Surfaces are flat at rest; elevation appears as frosted glass, soft ambient shadows, and a pink blush under accent elements. There are no hard shadows and no 3D transforms except playful micro-interactions.

- **Glass panels:** `backdrop-blur-xl/2xl` + `bg-white/70–95` + border `white/60–80` or `pink-100`. Used for every card, HUD island, modal, and the mobile nav.
- **Ambient shadow:** `0 8px 32px rgba(0,0,0,0.06–0.08)` for cards; `0 4px 16px` for smaller pills.
- **Pink blush shadow:** `0 8px 20–30px rgba(255,117,140,0.15–0.3)` on accent/pink elements (avatar, primary CTA, special cards).
- **Glow:** Livia's sprite carries a `drop-shadow` in her emotion color (e.g., `0 0 20px rgba(255,100,100,0.4)` angry, pink for blushing, amber for happy). Modal scrims: `bg-black/40–60` + `backdrop-blur-sm`.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows and blur exist only to separate floating UI from the room — never to make chrome feel heavier than the character.

## Shapes

A form language of soft, generous curves built for comfort — plus deliberate tactical skew for game moments.

- **Corner strategy:** Small controls `rounded-xl` (12px), cards/inputs/modals `rounded-2xl` (16px) and `rounded-[2rem]`–`rounded-[2.5rem]` (32–40px), status/avatar circles `rounded-full`. Dialogue and speech bubbles use asymmetric styling (`rounded-[4px_18px_18px_18px]` for chat, `rounded-2xl` with one `rounded-bl-xl` on home).
- **Skew/tactical:** The work hub uses `skew-x-[-8deg]`/`[-10deg]` for header bands and selected job cards; the landing page uses 90° corner brackets (`border-t border-l`) and hairline grid rules. This is the "game frame," applied only in game contexts.
- **Borders:** 2px (`border-2`) is the standard on interactive cards and bubbles; 1px hairline on panels. Pink borders signal active/affectionate; warm gray/orange borders (`border-orange-100`) signal neutral/financial.
- **Clipping:** Images (sprites, backgrounds) are never clipped into hard shapes except round avatars; full-bleed media is `object-cover`.

## Components

### Buttons
- **Shape:** `rounded-2xl` (16px) for primary/secondary; `rounded-full` pills for badges and segmented controls; occasionally `rounded-sm` (angular) for the landing's tactical CTAs.
- **Primary:** Gradient `from-[#ff758c] to-[#ff0844]` (or `#ff8c75`/`#ff7eb3` variants), white text, `font-display font-black`, `py-3–4`, `shadow-(pink-500/25)`, hover shifts hue slightly (`from-[#ff647e]`) and lifts `-translate-y-0.5`; active scales to `0.98`. Focus: `ring-2 ring-pink-500` + offset.
- **Secondary/ghost:** `bg-white`, `border-2 border-orange-100`, ink cocoa text, `rounded-2xl`, hover warms (`hover:bg-orange-50/50`).
- **Dark CTA:** `bg-[#5c4d47]` with white text (e.g., Work "Mulai" button); hover `#3d332f`.
- **Micro-interactions:** All buttons have `active:scale-95/98`, hover lift, and `transition-all duration-200–300`. Disabled state: `opacity-50 cursor-not-allowed`.

### Chips / Badges
- **Style:** `rounded-full`, `font-bold text-[9–12px]`, `px-2.5–3.5 py-1–1.5`, often `font-mono` for data badges.
- **States:** Active/selected = pink gradient with white text; neutral = `bg-pink-50 text-[#ff758c] border border-pink-100`; economic = amber (`bg-amber-50 text-amber-600 border-amber-200`). Level pills: `bg-pink-500 text-white`; pulse dot when online.

### Cards / Containers
- **Corner Style:** `rounded-[2rem]` (32px) for large cards/HUD islands; `rounded-2xl` for compact cards; `rounded-[1.5rem]–[2.5rem]` for dialogue boxes.
- **Background:** `bg-white/85–97` with `backdrop-blur-2xl`; solid white for modals.
- **Shadow Strategy:** Ambient `0 8px 32px rgba(0,0,0,0.06–0.08)`; pink blush for accent cards.
- **Border:** `border border-white/60–80` or `border-pink-100/80`; `border-2` on interactive/cards with states.
- **Internal Padding:** `p-4`–`p-6`, modals `p-6–8`.

### Inputs / Fields
- **Style:** `bg-orange-50/40` (warm tint), `border-2 border-orange-100`, `rounded-2xl`, `text-[#5c4d47]`, `placeholder-gray-400`, inner shadow hint (`shadow-inner`).
- **Focus:** `focus:border-[#ff758c] focus:bg-white` + `focus:ring-4 focus:ring-pink-500/10`; password/email fields include a right-side icon toggle.
- **Error / Disabled:** Error banner `bg-red-50/80 border-red-200 text-red-600 rounded-2xl`; success `bg-green-50/80 border-green-200 text-green-700`; disabled input `opacity-50 cursor-not-allowed`.

### Navigation
- **Mobile bottom bar:** Fixed glass pill `bg-white/95 backdrop-blur-2xl border-white/80 rounded-[2rem]` with 4+ items; icons in `p-2 rounded-xl` squares; active = `bg-pink-100 text-[#ff758c]`, inactive `text-gray-400 hover:text-[#ff758c]`.
- **Home side/command menu:** Entirely rounded pill chips (`rounded-l-full rounded-r-[2rem]`) on white glass; special card uses the pink gradient.
- **Header links:** `font-display font-black uppercase tracking-widest` text; back links are white on the work header band.

### [Signature Component] Dialogue Box (VN core)
- **Shape:** `rounded-[1.5rem]`–`rounded-[2.5rem]`, `border-[3px] rgba(255,207,239,0.6)`, `bg-white/85–95`, `backdrop-blur(24px)`, ambient pink shadow + inset top highlight.
- **Nameplate:** Above-box pill, `px-8 py-2 rounded-full`, gradient `#ff0844 → #ffb199`, white border, pink glow shadow; display serif black uppercase.
- **Text:** Quicksand/Nunito (rounded sans) 600, ink cocoa `#5c4d47`; narrator variant italic muted `#8a7e7a` on frost-white. Typewriter reveals at 25ms; a bouncing pink dot sits inline while typing; `✧` next-indicator bounces bottom-right.
- **Choices:** Stacked full-width pills `bg-white/95 border-2 border-pink-100`, serif bold, hover pink border/text + lift.

### [Signature Component] Affection / Life Bar
- Pill-level badge (`Lv. N — name` + `N/100` in mono amber) over a `h-4` track `bg-pink-50 border-pink-100 rounded-full shadow-inner`; fill is `bg-gradient-to-r from-pink-300 to-pink-500`, animates 1000ms.

### [Signature Component] Livia Sprite States
- Sprite sits bottom-center; expression drives a colored `drop-shadow` glow (list in LiviaSprite) and a radial VFX wash on the home backdrop (`mix-blend-screen`). Home background imagery renders at `opacity-40` under a cream-to-black gradient so text stays legible. Avatar gradients in chat/header: `from-[#ff758c] to-[#ff9a9e]`.

## Do's and Don'ts

### Do:
- **Do** build every surface on paper cream `#fdfbf7` with white glass cards; never introduce a second global background.
- **Do** reserve the pink gradient for the one meaningful action or live state per screen; let the rest of the screen read warm and quiet.
- **Do** use Cormorant Garamond (900, often uppercase, wide tracking) for titles and dialogue; DM Sans for body; DM Mono for HUD labels, numbers, and timers.
- **Do** round generously (16–32px), use pills for status, and keep the pink blush shadow on anything that carries affection or the primary CTA.
- **Do** use the emotion-keyed glow/VFX vocabulary so Livia's state is legible at a glance.
- **Do** keep keyboard focus visible: `ring-2 ring-pink-500` (offset on light surfaces) for all interactive elements.

### Don't:
- **Don't** render app chrome in the legacy dark palette from `globals.css` (`#0f0e0d`, `#1a1917`, `#2e2a25`) — it is an unused remnant; the living system is cream.
- **Don't** use cool blue-gray surfaces or pure black text for normal UI (the crisis panel and call screen are deliberate semantic exceptions).
- **Don't** set body copy or dialogue in DM Mono; it is a garnish and a scorekeeper, not a narrator.
- **Don't** add hard-edged rectangles or harsh drop shadows to the friendly surfaces — sharpness is reserved for the tactical game frame (landing brackets, work skew).
- **Don't** overuse pink beyond the ≤10% lamp budget; if a screen starts glowing, pull back to the named roles.
- **Don't** place white-on-amber or low-contrast gray on pink; keep mono readouts white on pink, ink on cream.
