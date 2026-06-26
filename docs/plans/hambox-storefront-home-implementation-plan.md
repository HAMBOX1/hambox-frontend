# HAMBOX Storefront Home — Implementation Plan

**Source:** Figma file `HAMBOX` (`ZKBsh3DmCbtUvJ2X8joHfO`)  
**Frame:** `HAMBOX Storefront Home` — node `1:1852`  
**Date:** 2026-06-21  
**Scope:** Single screen only (guest storefront landing page)

---

## 1. Screen overview

A dark-themed digital gaming marketplace landing page for unauthenticated (guest) users. The page promotes game keys, gift cards, subscriptions, and flash deals. Layout is a vertical stack of full-width sections constrained to a **1280px** content max-width with **64px** horizontal padding on desktop.

**Total frame height (desktop):** ~2572px  
**Primary visual language:** Dark charcoal surfaces, neon green accent (`#50ed95`), glassmorphism cards, image-heavy hero and category tiles.

---

## 2. Layout hierarchy

```
HAMBOX Storefront Home (1:1852)                    [bg: #131314]
│
├── TopNavBar (Guest) Component (97:36)            [sticky, 80px, blur backdrop]
│   └── Container (max 1280px, px 64)
│       ├── Left cluster
│       │   ├── Logo (hambox title)
│       │   └── Nav links: Games | Gift Cards | Subscriptions | Deals
│       └── Right cluster
│           ├── Search pill input
│           ├── Cart button (icon + label)
│           └── Sign In button (gradient green)
│
├── Main (1:1853)                                  [starts below nav at y=81]
│   │
│   ├── Hero Section (1:1883)                      [600px height, full bleed]
│   │   ├── Background image layer (gamer + neon lighting)
│   │   ├── Radial gradient overlays (green top-right, blue bottom-left)
│   │   ├── Left-to-right dark gradient scrim
│   │   └── Content column (max 672px)
│   │       ├── Badge pill: "NEW SEASON LIVE"
│   │       ├── H1: "The Next Level of Digital Gaming"
│   │       ├── Subtitle (2 lines, max 512px)
│   │       └── CTA row: [Shop Now] [View Deals]
│   │
│   ├── Section — Trust Bar (1:1854)             [full bleed, y≈600]
│   │   └── 3-column grid (48px row height)
│   │       ├── Instant Delivery
│   │       ├── Secure Payment
│   │       └── 24/7 Support
│   │
│   ├── Section — Popular Categories (1:1903)    [y≈714, max 1280px]
│   │   ├── H2: "Popular Categories"
│   │   └── 4-column grid (337.5px card height)
│   │       ├── Game Keys
│   │       ├── Gift Cards
│   │       ├── Subscriptions
│   │       └── Account Top-ups
│   │
│   ├── Section — Flash Deals (1:1939)           [full bleed bg #1c1b1c]
│   │   ├── Header row (title + link)
│   │   │   ├── Label: "FLASH DEALS" + timer "Ends in 04:22:15"
│   │   │   └── Link: "View all deals"
│   │   └── 3-column grid (399.88px card height)
│   │       ├── Elden Ring: Shadow of the Erdtree (-60%)
│   │       ├── EA SPORTS FC 24 (-35%)
│   │       └── $50 PlayStation Store Card (-15%)
│   │
│   └── Section — Trending Bento Grid (1:2016)   [y≈1755, max 1280px]
│       ├── H2: "Trending Now"
│       └── 4×2 bento grid (600px height)
│           ├── Large Feature (col 1–2, row 1–2): Premium Member Pass
│           ├── Rank card #1 (col 3, row 1): Minecraft Java
│           ├── Rank card #2 (col 4, row 1): Xbox Game Pass
│           └── Wide value card (col 3–4, row 2): Steam Wallet $100
│
└── Footer (98:277)                                [y≈2572, full bleed]
    ├── 4-column grid (py 32, px 64)
    │   ├── Brand column (logo + description)
    │   ├── NAVIGATION links
    │   ├── PROTOCOL links
    │   └── CONTACT US (social icons + system status card)
    └── Copyright bar (border-top, centered uppercase text)
```

### Section positioning (desktop, absolute in Figma)

| Section            | Top offset | Notes                          |
|--------------------|------------|--------------------------------|
| Top nav            | 0          | Fixed/sticky above main        |
| Hero               | 0 (in main)| 600px tall                     |
| Trust bar          | 600px      | Overlaps hero bottom edge      |
| Popular Categories | 714px      | 32px gap from trust bar        |
| Flash Deals        | 1155.5px   | Own background band            |
| Trending Now       | 1755.38px  | Standard section padding       |
| Footer             | 2572.38px  | Border-top separator           |

> **Implementation note:** In Angular, use normal document flow (not absolute positioning). Preserve visual order and spacing with flex/grid and section padding rather than Figma's absolute coordinates.

---

## 3. Components needed

### 3.1 By Figma component / pattern

| Figma name                    | Node ID  | Role                                      |
|-------------------------------|----------|-------------------------------------------|
| TopNavBar (Guest) Component   | 97:36    | Global header for guest users             |
| Hero Section                  | 1:1883   | Primary marketing hero                    |
| Section — Trust Bar           | 1:1854   | Trust/value proposition strip             |
| Link — Category Card          | 1:1907   | Category tile with image + gradient       |
| Section — Flash Deals         | 1:1939   | Timed promotion section                   |
| Flash Card 1/2/3              | 1:1953+  | Product deal card with discount badge     |
| Section — Trending Bento Grid | 1:2016   | Editorial + ranked products layout        |
| Large Feature                 | 1:2020   | Editor's choice featured promo            |
| Small Items (rank cards)      | 1:2032+  | Compact trending rank tiles               |
| Wide value card               | 1:2056   | Horizontal best-value promo               |
| Footer                        | 98:277   | Site footer with links and status         |

### 3.2 Atomic Design breakdown

#### Atoms
| Component            | Description                                              | PrimeNG candidate        |
|----------------------|----------------------------------------------------------|--------------------------|
| `HamboxBadge`        | Pill badges (NEW SEASON, discount %, EDITOR'S CHOICE)    | `p-tag`                  |
| `HamboxButton`       | Primary, glass, ghost, dark variants                     | `p-button`               |
| `SectionHeading`     | H2 with optional trailing action link                    | —                        |
| `PriceDisplay`       | Strikethrough original + colored sale price              | —                        |
| `IconCircle`         | 48px / 40px circular icon container on `#353436`         | —                        |
| `NavLink`            | Text link with active underline state                    | `RouterLink`             |

#### Molecules
| Component                  | Description                                    |
|----------------------------|------------------------------------------------|
| `TrustFeatureItem`         | Icon circle + title + subtitle                 |
| `StorefrontCategoryCard`   | Image tile, bottom gradient, title + subtitle  |
| `FlashDealCard`            | Image, discount badge, title, pricing, CTA     |
| `TrendingFeatureCard`      | Large bento feature with badge, copy, CTA      |
| `TrendingRankCard`         | Icon, rank #, title, subtitle, price           |
| `TrendingValueCard`        | Horizontal: badge, title, price, ghost CTA     |
| `SearchPill`               | Rounded search input with icon                 |
| `SocialIconButton`         | 40×40 social link button                       |
| `SystemStatusCard`         | Footer status panel                            |

#### Organisms
| Component                  | Description                                    |
|----------------------------|------------------------------------------------|
| `TopNavGuest`              | Full guest header                              |
| `HeroSection`              | Hero with background, copy, CTAs               |
| `TrustBar`                 | 3-column trust features                        |
| `PopularCategories`        | Section heading + category grid                |
| `FlashDealsSection`        | Flash header + countdown + deal grid           |
| `TrendingSection`          | Section heading + bento grid                   |
| `StorefrontFooter`         | 4-column footer + copyright                    |

#### Template / Page
| Component        | Description                                              |
|------------------|----------------------------------------------------------|
| `HomePage`       | Composes all organisms; owns mock/API data via signals   |

---

## 4. Typography

### 4.1 Font families

| Role        | Family   | Usage                                      |
|-------------|----------|--------------------------------------------|
| Headings    | **Sora** | H1, H2, H3, large feature titles, prices   |
| Body / UI   | **Manrope**| Nav, body copy, labels, buttons, footer  |

> Current codebase loads **Inter** only. Implementation must add Sora + Manrope via Google Fonts.

### 4.2 Type scale (from Figma)

| Element                         | Font     | Weight   | Size   | Line height | Letter spacing | Color      |
|---------------------------------|----------|----------|--------|-------------|----------------|------------|
| Hero H1                         | Sora     | Bold     | 48px   | 60px        | -0.96px        | `#e5e2e3` / accent `#50ed95` |
| Section H2                      | Sora     | Bold     | 32px   | 40px        | -0.32px        | `#e5e2e3`  |
| Large feature H3                | Sora     | Bold     | 48px   | 56px        | -0.96px        | `#e5e2e3`  |
| Card H3                         | Sora     | Semibold | 20px   | 28px        | —              | `#e5e2e3`  |
| Wide value title                | Sora     | Semibold | 24px   | 32px        | —              | `#e5e2e3`  |
| Hero primary CTA                | Sora     | Semibold | 20px   | 28px        | —              | `#00391d`  |
| Hero subtitle                   | Manrope  | Regular  | 18px   | 28px        | —              | `#bbcbbc`  |
| Body / footer body              | Manrope  | Regular  | 16px   | 24px        | —              | `#bbcbbc`  |
| Nav links                       | Manrope  | Semibold | 14px   | 20px        | 0.7px          | `#bbcbbc` / active `#50ed95` |
| UI buttons (secondary)          | Manrope  | Semibold | 14px   | 20px        | 0.7px          | `#e5e2e3`  |
| Sign In / Upgrade Now           | Manrope  | Bold     | 14px   | 20px        | 0.7px          | `#00210f` / `#00391d` |
| Badge / label uppercase         | Manrope  | Semibold | 14px   | 20px        | 1.4px          | varies     |
| Small caption                   | Manrope  | Regular  | 12px   | 16px        | —              | `#bbcbbc`  |
| System status label             | Manrope  | Bold     | 12px   | 16px        | 0.6px          | `#50ed95`  |
| Sale price (flash)              | Sora     | Semibold | 24px   | 32px        | —              | accent colors |
| Rank / small price              | Manrope  | Bold     | 16px   | 24px        | —              | accent colors |
| Footer column heading           | Manrope  | Semibold | 14px   | 20px        | 1.4px          | `#e5e2e3`  |
| Copyright                       | Manrope  | Semibold | 14px   | 20px        | 1.4px          | `#bbcbbc` @ 50% opacity |

### 4.3 Semantic text colors (price accents)

| Context              | Color     |
|----------------------|-----------|
| Default sale / rank  | `#50ed95` |
| EA FC 24 price       | `#b0c6ff` |
| PSN / best value     | `#ffc5b3` |
| Flash deals label    | `#ffb4ab` |

---

## 5. Colors

### 5.1 Core palette

| Token role              | Hex / value                        | Usage                              |
|-------------------------|------------------------------------|------------------------------------|
| Page background         | `#131314`                          | Root canvas                        |
| Section dark            | `#0e0e0f`                          | Trust bar, footer                  |
| Flash section bg        | `#1c1b1c`                          | Flash deals band                   |
| Card surface            | `#2a2a2b`                          | Search pill, flash cards           |
| Icon / button surface   | `#353436`                          | Trust icons, buy buttons           |
| Footer card             | `#201f20`                          | Social btn, system status          |
| Glass surface           | `rgba(255,255,255,0.03)`           | Category + trending cards          |
| Nav backdrop            | `rgba(19,19,20,0.8)` + 12px blur   | Sticky header                      |

### 5.2 Accent & semantic

| Token role              | Value                              |
|-------------------------|------------------------------------|
| Primary accent          | `#50ed95`                          |
| Accent gradient end     | `#40e18b`                          |
| Accent muted bg         | `rgba(80,237,149,0.1)`             |
| Accent border           | `rgba(80,237,149,0.2)`             |
| Accent text on green    | `#00391d`, `#00210f`               |
| Text primary            | `#e5e2e3`                          |
| Text secondary          | `#bbcbbc`                          |
| Placeholder             | `rgba(187,203,188,0.5)`            |
| Discount badge bg       | `#ffb4ab`                          |
| Discount badge text     | `#690005`                          |
| Price blue              | `#b0c6ff`                          |
| Price peach             | `#ffc5b3`                          |

### 5.3 Borders

| Token                   | Value                              |
|-------------------------|------------------------------------|
| Subtle                  | `rgba(255,255,255,0.05)`           |
| Default                 | `rgba(255,255,255,0.1)`            |
| Strong (Sign In)        | `rgba(255,255,255,0.2)`            |

### 5.4 Shadows & effects

| Effect                  | Value                              |
|-------------------------|------------------------------------|
| Sign In glow            | `0 0 15px rgba(80,237,149,0.2)`    |
| Shop Now glow           | `0 0 20px rgba(80,237,149,0.15)`   |
| Glass blur              | `backdrop-filter: blur(10px)`        |
| Nav blur                | `backdrop-filter: blur(12px)`        |
| Hero radial green       | `rgba(80,237,149,0.15)` → transparent |
| Hero radial blue        | `rgba(176,198,255,0.1)` → transparent |
| Hero left scrim         | `#131314` → `rgba(19,19,20,0.6)` → transparent |
| Category bottom scrim   | `#131314` → transparent (top)      |

### 5.5 CSS variables strategy

Add a **storefront-specific token set** (e.g. `--sf-*`) in `src/styles/_variables.scss` or a dedicated `_storefront-tokens.scss`. Do not overwrite existing light/orange `--hambox-*` tokens used elsewhere until a global theme migration is planned.

---

## 6. Spacing

### 6.1 Layout constants

| Token                    | Value   |
|--------------------------|---------|
| Max content width        | 1280px  |
| Horizontal padding (lg)    | 64px    |
| Nav height               | 80px    |
| Hero height              | 600px   |
| Trust bar vertical pad   | 17px    |
| Section vertical gap     | 32px    |
| Grid gap (cards)         | 24px    |
| Nav logo ↔ links gap     | 32px    |
| Nav links gap            | 24px    |
| Nav actions gap          | 16px    |
| Hero content gap         | 16px    |
| Hero CTA gap             | 16px    |
| Flash header gap         | 8px     |
| Card internal padding    | 24px    |
| Trending feature pad     | 33px    |
| Trending rank pad        | 25px    |
| Footer column gap        | 32px    |
| Footer link list gap     | 12px    |
| Footer heading gap       | 24px    |
| Copyright bar py         | 25px top / 24px bottom |

### 6.2 Border radius

| Element                  | Radius   |
|--------------------------|----------|
| Nav link hover           | 4px      |
| Sign In / small buttons  | 8px      |
| Primary CTAs             | 12px     |
| Category cards           | 16px     |
| Flash / trending cards   | 24px     |
| Pills (search, badges)   | 9999px   |
| Icon circles             | 9999px   |
| Rank icon square         | 8px      |

### 6.3 Fixed dimensions (desktop)

| Element                  | Size              |
|--------------------------|-------------------|
| Category card height     | 337.5px           |
| Flash card image         | 205.88px          |
| Flash card total         | ~399.88px         |
| Trending bento grid      | 600px height      |
| Trust icon circle        | 48×48px           |
| Rank icon square         | 40×40px           |
| Social buttons           | 40×40px           |
| Search input width       | 192px (text area) |
| Hero content max width   | 672px             |
| Hero subtitle max width  | 512px             |
| Feature description max  | 384px             |

---

## 7. Responsive behavior

Figma provides a **1280px desktop** frame only. Responsive rules below are derived from layout constraints and standard breakpoints aligned with existing project tokens (`576 / 768 / 992 / 1200px`).

### 7.1 Desktop (≥ 992px) — matches Figma

- Full horizontal nav with logo, 4 links, search, cart, sign-in.
- Hero at 600px with left-aligned copy over full-bleed image.
- Trust bar: 3 columns.
- Categories: 4 columns.
- Flash deals: 3 columns.
- Trending: 4-column bento (2×2 feature + 2 rank + 2 wide).
- Footer: 4 columns.

### 7.2 Tablet (768px – 991px)

| Area          | Behavior                                                    |
|---------------|-------------------------------------------------------------|
| Nav           | Hide inline nav links; keep logo, search, cart, sign-in     |
| Padding       | Reduce horizontal padding to 24px                           |
| Hero          | Reduce min-height to ~480px; maintain left-aligned copy     |
| Trust bar     | 3 columns → stack to 1 column or 3 compact rows             |
| Categories    | 2 columns                                                   |
| Flash deals   | 2 columns (third card wraps)                                |
| Trending      | 2 columns; feature spans full width; rank cards side-by-side; value card full width |
| Footer        | 2×2 column grid                                             |

### 7.3 Mobile (< 768px)

| Area          | Behavior                                                    |
|---------------|-------------------------------------------------------------|
| Nav           | Logo + hamburger (or cart icon only) + sign-in; search hidden or expandable |
| Padding       | 16px horizontal                                             |
| Hero          | ~400px min-height; H1 scales to 32–36px; CTAs stack vertically full-width |
| Trust bar     | Single column, 3 stacked items                              |
| Categories    | 1 column                                                    |
| Flash deals   | 1 column; header stacks (timer below label)                 |
| Trending      | Single column stack: feature → rank #1 → rank #2 → value card |
| Footer        | Single column; social + status below links                  |
| Typography    | Scale H1 48→32px, H2 32→24px, preserve line-height ratios   |

### 7.4 Responsive implementation rules

1. Use CSS Grid with `repeat(auto-fit, minmax(...))` or explicit breakpoint overrides — no absolute positioning.
2. Hero background: `object-fit: cover`; reposition focal point on mobile (`object-position`).
3. Maintain touch targets ≥ 44px on mobile for CTAs and nav actions.
4. Countdown timer in Flash Deals: use a `signal` + `computed` label; interval only active when section is visible (optional optimization).

---

## 8. Angular component breakdown

### 8.1 File structure (recommended)

```
src/
├── assets/storefront/                          # Figma-exported images
│   ├── hambox-logo.png
│   ├── hero-bg.jpg
│   ├── categories/
│   ├── deals/
│   └── trending/
├── styles/
│   └── _storefront-tokens.scss                 # --sf-* CSS variables
└── app/
    ├── features/home/
    │   ├── models/
    │   │   └── storefront-home.ts              # Interfaces for page data
    │   ├── components/                         # Feature-scoped organisms
    │   │   ├── top-nav-guest/
    │   │   ├── hero-section/
    │   │   ├── trust-bar/
    │   │   ├── popular-categories/
    │   │   ├── flash-deals-section/
    │   │   └── trending-section/
    │   ├── pages/home-page/
    │   │   └── home-page.component.*           # Page template (orchestrator)
    │   └── home.routes.ts
    └── shared/components/                      # Reusable molecules
        ├── hambox-badge/
        ├── trust-feature-item/
        ├── storefront-category-card/
        ├── flash-deal-card/
        ├── trending-feature-card/
        ├── trending-rank-card/
        ├── trending-value-card/
        └── storefront-footer/
```

> **Note:** Partial implementation already exists under `features/home/components/` and `shared/components/`. This plan consolidates the target architecture; reconcile duplicates (e.g. `category-card` vs `storefront-category-card`) during implementation.

### 8.2 Component responsibilities

| Angular component              | Selector (suggested)           | Inputs / outputs                          | Change detection |
|--------------------------------|--------------------------------|-------------------------------------------|------------------|
| `HomePageComponent`            | `app-home-page`                | — (owns data signals)                     | `OnPush`         |
| `TopNavGuestComponent`         | `app-top-nav-guest`            | `links: NavLink[]`                        | `OnPush`         |
| `HeroSectionComponent`         | `app-hero-section`             | Optional CTA route outputs                | `OnPush`         |
| `TrustBarComponent`            | `app-trust-bar`                | `features: TrustFeature[]`                | `OnPush`         |
| `PopularCategoriesComponent`   | `app-popular-categories`       | `categories: StorefrontCategory[]`        | `OnPush`         |
| `FlashDealsSectionComponent`   | `app-flash-deals-section`      | `deals`, `countdownLabel`; `viewAll` out  | `OnPush`         |
| `TrendingSectionComponent`     | `app-trending-section`         | `rankItems`, `valueItem`, feature config  | `OnPush`         |
| `StorefrontFooterComponent`    | `app-storefront-footer`        | Static link groups                        | `OnPush`         |
| `FlashDealCardComponent`       | `app-flash-deal-card`          | `deal`; `buyNow` output                   | `OnPush`         |
| `StorefrontCategoryCardComponent` | `app-storefront-category-card` | `category`                             | `OnPush`         |

### 8.3 Data models (`storefront-home.ts`)

```text
NavLink          → label, route, active?
TrustFeature     → icon, title, subtitle
StorefrontCategory → id, title, subtitle, image, route
FlashDeal        → id, title, platform, image, discount, originalPrice, salePrice, priceColor
TrendingRankItem → id, rank, rankColor, icon, title, subtitle, price, priceColor
TrendingValueItem → id, badge, title, subtitle, price
```

### 8.4 PrimeNG mapping

| UI element        | PrimeNG module        | Custom SCSS via `styleClass` |
|-------------------|-----------------------|------------------------------|
| Shop Now / CTAs   | `ButtonModule`        | Yes — green / glass / dark   |
| Sign In           | `ButtonModule`        | Yes — gradient + glow        |
| Search            | `InputTextModule`, `IconFieldModule`, `InputIconModule` | Yes — pill style |
| Discount badges   | `TagModule`           | Yes — coral pill             |
| Cart              | `ButtonModule` or native `<a>` | Minimal               |

### 8.5 Routing & layout

| Concern              | Decision                                                |
|----------------------|---------------------------------------------------------|
| Route                | `/home` (default redirect from `''`)                    |
| Layout               | `MainLayoutComponent` should render `<router-outlet>` only; nav/footer belong to this page per Figma |
| Auth state           | This frame is **guest** variant; authenticated nav is out of scope |

### 8.6 Assets to export from Figma

| Asset                    | Used in                          |
|--------------------------|----------------------------------|
| HAMBOX logo              | Nav, footer                      |
| Hero gamer image         | Hero background                  |
| 4 category images        | Popular Categories               |
| 3 flash deal images      | Flash Deals                      |
| Premium Member Pass bg   | Trending feature card            |
| Platform icons           | Rank cards (Minecraft, Xbox)     |
| Search, cart, user icons | Nav (or PrimeIcons equivalents)  |
| Social icons             | Footer (Facebook, WhatsApp, Telegram) |
| Flash deals bolt icon    | Flash section label              |

> Figma MCP asset URLs expire after ~7 days. Download and commit to `src/assets/storefront/` during implementation.

---

## 9. Content inventory (copy)

### Navigation
- Games (active), Gift Cards, Subscriptions, Deals
- Search placeholder: "Search digital goods..."
- Cart, Sign In

### Hero
- Badge: NEW SEASON LIVE
- Headline: The Next Level of **Digital Gaming**
- Body: Unlock thousands of titles with instant digital delivery. / Experience the safest marketplace for gamers worldwide.
- CTAs: Shop Now, View Deals

### Trust bar
1. Instant Delivery — Codes delivered in seconds
2. Secure Payment — 100% encrypted transactions
3. 24/7 Support — We're here whenever you play

### Popular Categories
1. Game Keys — Starting from $4.99
2. Gift Cards — Global availability
3. Subscriptions — Monthly & Yearly
4. Account Top-ups — Fast & Safe

### Flash Deals
- Label: FLASH DEALS
- Timer: Ends in 04:22:15
- Link: View all deals
- Products: Elden Ring (-60%, $59.99→$23.99), EA FC 24 (-35%, $69.99→$45.50), PSN $50 (-15%, $50.00→$42.50)

### Trending Now
- Feature: EDITOR'S CHOICE — Premium Member Pass — Upgrade Now
- #1 Minecraft Java — $18.99
- #2 Xbox Game Pass — $29.99
- BEST VALUE — Steam Wallet $100 — $92.00 — Grab Now

### Footer
- Tagline: The world's premier digital terminal for gamers. High-fidelity service since 2018.
- NAVIGATION: Marketplace, Gift Cards, Subscriptions, Affiliate Program
- PROTOCOL: Terms of Service, Privacy Protocol, Support Center, Verification Status
- CONTACT US + social + SYSTEM STATUS: All Systems Operational
- © 2026 HAMBOX GLOBAL. ALL RIGHTS RESERVED. SECURE TERMINAL ACTIVE.

---

## 10. Implementation checklist

- [ ] Add `--sf-*` storefront CSS variables and Sora/Manrope fonts
- [ ] Export and commit all Figma image assets
- [ ] Implement atoms (`HamboxBadge`, button variants)
- [ ] Implement shared molecules (cards, trust item)
- [ ] Implement feature organisms (nav, hero, sections)
- [ ] Wire `HomePageComponent` with signals + `OnPush`
- [ ] Replace placeholder `main-layout` with router outlet
- [ ] Implement responsive breakpoints (desktop / tablet / mobile)
- [ ] Wire PrimeNG components with custom SCSS (no inline styles)
- [ ] Add countdown signal for flash deals timer
- [ ] Visual QA against Figma screenshot at 1280px
- [ ] Responsive QA at 768px and 375px

---

## 11. Out of scope

- Authenticated / logged-in navigation variant
- Backend API integration (use static mock data initially)
- Other routes (products, cart, auth) beyond link targets
- Dark/light theme toggle (frame is dark-only)
- Animations beyond CSS transitions specified in Figma (shimmer on buttons is decorative; optional)

---

## 12. References

- Figma: https://www.figma.com/design/ZKBsh3DmCbtUvJ2X8joHfO/HAMBOX?node-id=1-1852
- Existing partial code: `src/app/features/home/components/`, `src/app/shared/components/storefront-*`
- Project breakpoints: `src/styles/_variables.scss`
