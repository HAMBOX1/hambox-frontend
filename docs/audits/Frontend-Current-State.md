# HAMBOX Frontend — Code-Level Audit

**Date:** 2026-06-24  
**Method:** Direct inspection of `src/` source files (no requirement inference)  
**Angular:** 21.x standalone  
**Auditor scope:** Pages, layouts, components, services, routing, data sources, API usage, localization

---

## 1. Executive Summary

| Finding | Result |
|---------|--------|
| **Routed pages** | 17 total — 8 with full storefront UI, 9 inline stubs |
| **Pages on mock/static data** | 8 (all implemented storefront pages) |
| **Pages on real APIs** | **0** — no `HttpClient`, `provideHttpClient`, or `http.get/post` anywhere in `src/` |
| **Layouts** | 2 minimal shells (`main-layout`, `auth-layout`) — no storefront or admin layout |
| **Admin shell components** | 3 built (`navbar`, `sidebar`, `topbar`) — **not imported by any page or layout** |
| **Localization** | **0** configured components/services — static `EN` / `USD` labels in `top-nav-user` only |
| **`src/app/core/`** | Does not exist |
| **Route guards** | None (`canActivate` not used) |
| **Environment config** | None |
| **`app.config.ts` providers** | `provideBrowserGlobalErrorListeners`, `provideRouter` only |

### Status legend

| Status | Code evidence |
|--------|---------------|
| **Exists** | Routed or present with a real template (not `works!` placeholder) and meaningful UI |
| **Partial** | File/route exists but stub, unwired, non-functional interaction, or single hardcoded dataset |
| **Missing** | Not present in codebase, or routed page is an inline stub only |

### Data source legend

| Label | Meaning |
|-------|---------|
| **Mock** | Static `*-data.ts` constants or in-memory signals seeded from mock files |
| **API** | `HttpClient` call to backend |
| **None** | Stub page with no data layer |

---

## 2. Global Infrastructure

| Item | Status | Evidence |
|------|--------|----------|
| `provideHttpClient` | **Missing** | `src/app/app.config.ts` — not registered |
| `HttpClient` usage | **Missing** | `rg HttpClient src` → 0 matches |
| Environment files | **Missing** | No `environment*.ts` under `src/` or project root |
| Auth guard | **Missing** | No `*.guard.ts`; `app.routes.ts` has no `canActivate` |
| HTTP interceptors | **Missing** | No `*.interceptor.ts` |
| `src/app/core/` | **Missing** | Directory does not exist |
| `provideAnimations` | **Missing** | Not in `app.config.ts` |
| `providePrimeNG` | **Missing** | PrimeNG modules imported per-component only |
| `@ngx-translate` wiring | **Missing** | In `package.json`; not imported or configured in `src/` |
| i18n asset files | **Missing** | No `assets/i18n/` or `public/assets/i18n/` |
| `jwt-decode` usage | **Missing** | In `package.json`; 0 imports in `src/` |
| `ng-apexcharts` usage | **Missing** | 0 imports in `src/` |
| `xlsx` / `file-saver` usage | **Missing** | 0 imports in `src/` |
| `dayjs` usage | **Missing** | 0 imports in `src/` |

---

## 3. Layouts

| Layout | Route prefix | Status | Evidence |
|--------|--------------|--------|----------|
| `MainLayoutComponent` | `/` (non-auth) | **Partial** | `layouts/main-layout/main-layout.component.ts` — inline template `<router-outlet>` only; no nav/footer |
| `AuthLayoutComponent` | `/auth` | **Partial** | `layouts/auth-layout/auth-layout.component.ts` — inline `<router-outlet>` only; `auth-layout.html` scaffold (`auth-layout works!`) unused |
| Storefront layout | — | **Missing** | No `storefront-layout/` directory; each page embeds nav/footer directly |
| Admin layout | — | **Missing** | No `admin-layout/` directory; admin routes use `main-layout` |

---

## 4. Pages (Routed)

All routes defined in `src/app/app.routes.ts` and feature `*.routes.ts` files.

| Page | URL | UI status | Data source | API connected | Notes |
|------|-----|-----------|-------------|---------------|-------|
| Login | `/auth/login` | **Missing** | None | No | `login-page.component.ts` → `template: '<p>login works!</p>'` |
| Register | `/auth/register` | **Missing** | None | No | `register-page.component.ts` → inline stub |
| Home | `/home` | **Exists** | **Mock** | No | `home-page.component.ts` imports `storefront-home-data.ts` |
| Products | `/products` | **Exists** | **Mock** | No | Imports `storefront-products-data.ts`; filters/search/load-more not wired to behavior |
| Product details | `/product-details` | **Partial** | **Mock** | No | Full PDP UI; hardcoded `PSN_GIFT_CARD_DETAILS`; no `:id` route param; add-to-cart buttons have no handlers |
| Cart | `/cart` | **Exists** | **Mock** | No | `Cart` service seeds from `cart-data.ts` (`INITIAL_CART_ITEMS`) |
| Checkout | `/checkout` | **Exists** | **Mock** | No | `Checkout` service uses `checkout-data.ts`; `completePurchase()` only navigates to processing |
| Payment processing | `/checkout/processing` | **Partial** | None | No | UI exists; `payment-processing-card` fakes progress with `interval()` then navigates to success |
| Order success | `/checkout/success` | **Exists** | **Mock** | No | Static `ORDER_SUCCESS_DETAILS` from `order-success-data.ts` |
| Favorites | `/favorites` | **Missing** | None | No | Inline stub |
| Profile | `/profile` | **Missing** | None | No | Inline stub |
| Support chat | `/support-chat` | **Missing** | None | No | Inline stub |
| Dashboard | `/dashboard` | **Missing** | None | No | Inline stub |
| Orders | `/orders` | **Missing** | None | No | Inline stub |
| Customers | `/customers` | **Missing** | None | No | Inline stub |
| Inventory | `/inventory` | **Missing** | None | No | Inline stub |

### Pages connected to real APIs

**None.** Verified by searching `src/` for `HttpClient`, `provideHttpClient`, `http.get`, `http.post`, and `fetch(` — all returned zero application-code matches.

### Mock data files (static)

| File | Consumed by |
|------|-------------|
| `features/home/services/storefront-home-data.ts` | `HomePageComponent` |
| `features/products/services/storefront-products-data.ts` | `ProductsPageComponent`, cart/checkout/PDP nav links |
| `features/product-details/services/product-details-data.ts` | `ProductDetailsPageComponent` (`PSN_GIFT_CARD_DETAILS`) |
| `features/cart/services/cart-data.ts` | `Cart` service |
| `features/checkout/services/checkout-data.ts` | `Checkout` service, billing form, payment selector |
| `features/checkout/services/order-success-data.ts` | `OrderSuccessPageComponent` |

---

## 5. Feature Services

| Service | File | Status | Data source |
|---------|------|--------|-------------|
| `Auth` | `features/auth/services/auth.ts` | **Missing** | Empty class `export class Auth {}` |
| `Home` | `features/home/services/home.ts` | **Missing** | Empty class; unused — page uses `storefront-home-data.ts` directly |
| `Products` | `features/products/services/products.ts` | **Missing** | Empty class; unused |
| `ProductDetails` | `features/product-details/services/product-details.ts` | **Missing** | Empty class; unused |
| `Cart` | `features/cart/services/cart.ts` | **Exists** | In-memory signals seeded from `cart-data.ts` |
| `Checkout` | `features/checkout/services/checkout.ts` | **Partial** | In-memory signals + `checkout-data.ts`; `applyDiscount()` is empty comment stub |
| `Favorites` | `features/favorites/services/favorites.ts` | **Missing** | Empty class |
| `Profile` | `features/profile/services/profile.ts` | **Missing** | Empty class |
| `SupportChat` | `features/support-chat/services/support-chat.ts` | **Missing** | Empty class |
| `Dashboard` | `features/dashboard/services/dashboard.ts` | **Missing** | Empty class |
| `Orders` | `features/orders/services/orders.ts` | **Missing** | Empty class |
| `Customers` | `features/customers/services/customers.ts` | **Missing** | Empty class |
| `Inventory` | `features/inventory/services/inventory.ts` | **Missing** | Empty class |

---

## 6. Feature Components

### 6.1 Home (`features/home/components/`)

| Component | Status | Wired | Notes |
|-----------|--------|-------|-------|
| `top-nav-guest` | **Exists** | Home, products, PDP | Search input updates local signal only; no navigation |
| `top-nav-user` | **Partial** | Cart, checkout, processing, success | Language/currency buttons are static `EN`/`USD`; no click handlers |
| `hero-section` | **Exists** | Home | Static content in template |
| `trust-bar` | **Exists** | Home | Input-driven from mock data |
| `popular-categories` | **Exists** | Home | Uses `storefront-category-card` |
| `flash-deals-section` | **Exists** | Home | Client-side countdown from mock seconds |
| `trending-section` | **Exists** | Home | Input-driven from mock data |

### 6.2 Products (`features/products/components/`)

| Component | Status | Wired | Notes |
|-----------|--------|-------|-------|
| `store-filters-sidebar` | **Partial** | Products page | Displays filters; no outputs / no filter application |
| `store-toolbar` | **Partial** | Products page | Category/sort state is local signal only; does not filter products |
| `store-promo-banner` | **Exists** | Products page | Display only |
| `store-product-card` | **Partial** | Products page | CTA buttons have no `(click)` handlers; no `routerLink` to PDP |
| `store-load-more` | **Partial** | Products page | Static “LOADING MORE” button; empty component class |

### 6.3 Cart (`features/cart/components/`)

| Component | Status | Wired | Notes |
|-----------|--------|-------|-------|
| `cart-line-item` | **Exists** | Cart page | Wired to `Cart` service via page |
| `cart-order-summary` | **Exists** | Cart page | Wired to `Cart` service summary |

### 6.4 Checkout (`features/checkout/components/`)

| Component | Status | Wired | Notes |
|-----------|--------|-------|-------|
| `payment-method-selector` | **Exists** | Checkout page | Uses `Checkout` service + `checkout-data.ts` |
| `checkout-card-form` | **Exists** | Checkout page | Uses `Checkout` service |
| `checkout-billing-form` | **Exists** | Checkout page | Uses `Checkout` service + `CHECKOUT_COUNTRIES` mock |
| `checkout-order-summary` | **Partial** | Checkout page | `completePurchase()` → `router.navigate(['/checkout/processing'])` only |
| `payment-processing-card` | **Partial** | Processing page | Timer-based fake progress; no API poll |
| `order-success-hero` | **Exists** | Success page | Display only |
| `order-purchased-items` | **Exists** | Success page | Display only |
| `order-referral-banner` | **Exists** | Success page | Static template |
| `order-recommendations` | **Exists** | Success page | Static mock recommendations |
| `order-support-sidebar` | **Exists** | Success page | Static template |

### 6.5 Admin pages

No admin feature components exist beyond stub page components (inline `works!` templates).

---

## 7. Shared Components

### 7.1 Storefront (used in app)

| Component | Status | Used by |
|-----------|--------|---------|
| `storefront-footer` | **Exists** | Home, products, PDP, cart, checkout, processing, success |
| `storefront-category-card` | **Exists** | `popular-categories` |
| `storefront-field-select` | **Exists** | PDP region/value selectors |
| `flash-deal-card` | **Exists** | `flash-deals-section` |
| `trending-rank-card` | **Exists** | `trending-section` |
| `trending-value-card` | **Exists** | `trending-section` |
| `trending-feature-card` | **Exists** | `trending-section` |

### 7.2 Admin shell (built, not wired)

| Component | Status | Used by |
|-----------|--------|---------|
| `navbar` | **Partial** | **Nothing** — `navbar.component.html` has PrimeNG Menubar UI |
| `sidebar` | **Partial** | **Nothing** — `sidebar.component.html` has PrimeNG Drawer + Menu |
| `topbar` | **Partial** | **Nothing** — imports `search-box`; not used in any layout/page |
| `search-box` | **Partial** | `topbar` only (which is unused) |

### 7.3 Generic shared (built, not wired)

| Component | Status | Used by |
|-----------|--------|---------|
| `empty-state` | **Partial** | **Nothing** — full component at `empty-state.component.ts` |
| `loading-skeleton` | **Partial** | **Nothing** — full component at `loading-skeleton.component.ts` |
| `product-card` | **Partial** | **Nothing** — products use feature-local `store-product-card` |
| `category-card` | **Partial** | **Nothing** — home uses `storefront-category-card` |
| `footer` | **Partial** | **Nothing** — generic food-delivery footer text; storefront uses `storefront-footer` |

### 7.4 Scaffold duplicates (ignored at runtime)

Many folders contain unused CLI scaffolds (`*.ts` + `*.html` with `works!`) alongside routed `*.component.ts` files. Only `*.component.ts` files referenced in `*.routes.ts` are active.

---

## 8. Localization

| Item | Status | Evidence |
|------|--------|----------|
| `ngx-translate` in `app.config.ts` | **Missing** | Not configured |
| `TranslateService` / `translate` pipe usage | **Missing** | 0 matches in `src/` |
| Translation JSON files | **Missing** | No `i18n` directory under `public/` or `src/` |
| `LanguageService` | **Missing** | No file |
| `CurrencyService` | **Missing** | No file |
| Language switcher component | **Missing** | Only static button in `top-nav-user.component.html` L22–28 |
| Currency switcher component | **Missing** | Only static button in `top-nav-user.component.html` L30–35 |
| RTL / `dir` attribute handling | **Missing** | No code toggling document direction |
| `Accept-Language` header | **Missing** | No interceptors |

**Localization components that exist:** **None** (only non-functional static UI affordances in `top-nav-user`).

---

## 9. Routing Audit

| Route concern | Status | Evidence |
|---------------|--------|----------|
| Product `:id` param | **Missing** | `product-details.routes.ts` → `path: ''` only |
| Admin route grouping | **Missing** | `/dashboard`, `/orders`, etc. sit alongside storefront under same layout |
| Auth route protection | **Missing** | No guards on `/checkout`, `/profile`, `/cart` |
| Admin route protection | **Missing** | No guards on admin paths |
| Wildcard handling | **Partial** | `path: '**'` redirects to `''` → home (no 404 page) |
| Search query params | **Missing** | Nav search does not navigate with `?q=` |

### Active route map

```
/auth/login, /auth/register     → AuthLayoutComponent (stub pages)
/home                           → HomePageComponent
/products                       → ProductsPageComponent
/product-details                → ProductDetailsPageComponent (no id)
/cart                           → CartPageComponent
/checkout                       → CheckoutPageComponent
/checkout/processing            → PaymentProcessingPageComponent
/checkout/success               → OrderSuccessPageComponent
/favorites, /profile, /support-chat
/dashboard, /orders, /customers, /inventory   → all stubs
```

---

## 10. Models Audit

| Model file | Status |
|------------|--------|
| `home/models/storefront-home.ts` | **Exists** — full interfaces |
| `products/models/product.ts` | **Exists** — full interfaces |
| `product-details/models/product-details.ts` | **Exists** — full interfaces |
| `cart/models/cart.ts` | **Exists** — full interfaces |
| `checkout/models/checkout.ts` | **Exists** — full interfaces |
| `checkout/models/order-success.ts` | **Exists** — full interfaces |
| `auth/models/auth.ts` | **Missing** — `export interface Auth {}` |
| `home/models/home.ts` | **Missing** — empty interface |
| `dashboard/models/dashboard.ts` | **Missing** — empty interface |
| `orders/models/order.ts` | **Missing** — empty interface |
| `customers/models/customer.ts` | **Missing** — empty interface |
| `inventory/models/inventory.ts` | **Missing** — empty interface |
| `profile/models/profile.ts` | **Missing** — empty interface |
| `favorites/models/favorite.ts` | **Missing** — empty interface |
| `support-chat/models/chat.ts` | **Missing** — empty interface |

---

## 11. Inventory Summary

| Category | Exists | Partial | Missing |
|----------|--------|---------|---------|
| **Pages (17 routed)** | 6 | 3 | 8 |
| **Layouts** | 0 | 2 | 2 |
| **Feature services (13)** | 1 | 1 | 11 |
| **Home components (7)** | 5 | 2 | 0 |
| **Products components (5)** | 1 | 4 | 0 |
| **Cart components (2)** | 2 | 0 | 0 |
| **Checkout components (10)** | 7 | 3 | 0 |
| **Storefront shared (7)** | 7 | 0 | 0 |
| **Admin shared (4)** | 0 | 4 | 0 |
| **Generic shared (5)** | 0 | 5 | 0 |
| **Localization** | 0 | 0 | 8+ items |
| **Core infrastructure** | 0 | 1 (router) | 10+ items |
| **API-connected pages** | 0 | 0 | 17 |

---

## 12. Revised Sprint 1 Completion Plan (Gap-Only)

This plan includes **only work justified by the audit above**. It does not add features absent from the codebase. Tasks are ordered by dependency.

### Phase A — Core wiring (blocks all API work)

| ID | Task | Closes gap | Depends on |
|----|------|------------|------------|
| A-01 | Add `environment.ts` / `environment.development.ts` with `apiUrl` + `angular.json` file replacements | Environment **Missing** | — |
| A-02 | Register `provideHttpClient()` in `app.config.ts` | HttpClient **Missing** | A-01 |
| A-03 | Create `src/app/core/` with API base helper | `core/` **Missing** | A-02 |
| A-04 | Register `provideAnimations()` + `providePrimeNG()` | PrimeNG global **Missing** | — |

### Phase B — Authentication (8 pages/services missing)

| ID | Task | Closes gap | Depends on |
|----|------|------------|------------|
| B-01 | Implement `Auth` service with login/register/me/logout API calls | `Auth` service **Missing** | A-02 |
| B-02 | Populate `auth/models/auth.ts` with real DTOs | Auth models **Missing** | — |
| B-03 | Token storage + session state (use installed `jwt-decode`) | jwt-decode **Missing** usage | B-01 |
| B-04 | Auth + error HTTP interceptors | Interceptors **Missing** | B-03 |
| B-05 | `authGuard`, `guestGuard` | Guards **Missing** | B-03 |
| B-06 | Build login page UI (replace inline stub) | Login page **Missing** | B-01, B-02 |
| B-07 | Build register page UI (replace inline stub) | Register page **Missing** | B-01, B-02 |
| B-08 | Brand `auth-layout` (replace bare outlet) | Auth layout **Partial** | B-06 |
| B-09 | Apply `authGuard` to `/cart`, `/checkout`, `/profile` | Route protection **Missing** | B-05 |
| B-10 | Wire nav: show `top-nav-guest` vs `top-nav-user` from auth state | Nav auth switching **Missing** | B-03 |

### Phase C — Storefront API integration (6 pages on mock data)

| ID | Task | Closes gap | Depends on |
|----|------|------------|------------|
| C-01 | Implement `Products` service → replace `storefront-products-data.ts` usage | `Products` service **Missing** | A-02 |
| C-02 | Wire `products-page` to `Products` service; connect toolbar/sidebar filters | Products filters **Partial** | C-01 |
| C-03 | Wire `store-load-more` to pagination API | Load more **Partial** | C-01 |
| C-04 | Add `products/:id` route; load PDP by id | PDP route **Missing** / **Partial** | C-01 |
| C-05 | Implement `ProductDetails` service; remove hardcoded `PSN_GIFT_CARD_DETAILS` | PDP data **Mock** | C-04 |
| C-06 | Wire PDP add-to-cart / buy-now buttons | PDP actions **Partial** | C-05, D-01 |
| C-07 | Implement `Home` service; replace `storefront-home-data.ts` | `Home` service **Missing** | A-02 |
| C-08 | Wire search inputs (guest + user nav) → `/products?q=` | Search **Missing** | C-02 |
| C-09 | Link `store-product-card` to PDP route | Product navigation **Missing** | C-04 |
| C-10 | Use `loading-skeleton` + `empty-state` on async catalog pages | Shared components **Partial** (unwired) | C-01 |

### Phase D — Cart & checkout API integration

| ID | Task | Closes gap | Depends on |
|----|------|------------|------------|
| D-01 | Extend `Cart` service with API sync (replace `cart-data.ts` seed) | Cart **Mock** | B-01, A-02 |
| D-02 | Implement checkout submit API in `Checkout` service | `completePurchase()` **Partial** | D-01, B-01 |
| D-03 | Replace fake timer in `payment-processing-card` with order status polling | Processing **Partial** | D-02 |
| D-04 | Load order success page from API by order id | Success page **Mock** | D-02 |
| D-05 | Implement `applyDiscount()` or remove UI until API exists | Checkout discount **Partial** | D-02 |

### Phase E — Account pages (stubs)

| ID | Task | Closes gap | Depends on |
|----|------|------------|------------|
| E-01 | Build profile page (replace stub) + `Profile` service | Profile **Missing** | B-01, B-09 |
| E-02 | Build customer orders page or repurpose `/orders` with role-based view + `Orders` service | Orders page **Missing** | B-01, D-02 |

> **Deferred (stub exists, no storefront UI precedent):** `/favorites`, `/support-chat` — remain **Missing** until product scope adds them.

### Phase F — Admin (4 stub pages + unwired shell)

| ID | Task | Closes gap | Depends on |
|----|------|------------|------------|
| F-01 | Create `admin-layout` using existing `sidebar`, `topbar`, `navbar` | Admin layout **Missing**; shell **Partial** | A-04 |
| F-02 | Move `/dashboard`, `/orders`, `/customers`, `/inventory` under `/admin` + `adminGuard` | Admin routing **Missing** | B-05, F-01 |
| F-03 | Build dashboard page + `Dashboard` service (use installed `ng-apexcharts`) | Dashboard **Missing** | F-02, A-02 |
| F-04 | Build orders admin page + `Orders` service admin endpoints | Orders admin **Missing** | F-02 |
| F-05 | Build customers page + `Customers` service | Customers **Missing** | F-02 |
| F-06 | Build inventory page + `Inventory` service | Inventory **Missing** | F-02 |
| F-07 | Populate empty admin models (`dashboard`, `order`, `customer`, `inventory`) | Models **Missing** | F-03–F-06 |
| F-08 | Optional: wire `xlsx`/`file-saver` export on admin tables | Packages **Missing** usage | F-04, F-06 |

### Phase G — Localization (all missing)

| ID | Task | Closes gap | Depends on |
|----|------|------------|------------|
| G-01 | Configure `@ngx-translate` in `app.config.ts` | ngx-translate **Missing** | A-02 |
| G-02 | Add `public/assets/i18n/en.json` (+ `ar.json` if needed) | i18n files **Missing** | G-01 |
| G-03 | Create `LanguageService` + language switcher component | Switcher **Missing** | G-01 |
| G-04 | Wire language buttons in `top-nav-user` (and guest nav if required) | Static EN label **Partial** | G-03 |
| G-05 | Create `CurrencyService` + display pipe; wire currency button | Currency **Missing** | A-02 |
| G-06 | RTL `dir` toggle for Arabic | RTL **Missing** | G-03 |
| G-07 | Externalize strings in existing storefront templates | No translate usage | G-02 |
| G-08 | `localeInterceptor` for `Accept-Language` header | Header **Missing** | G-03, B-04 |

### Phase H — Layout cleanup (optional but closes Partial gaps)

| ID | Task | Closes gap | Depends on |
|----|------|------------|------------|
| H-01 | Create `storefront-layout` (nav + outlet + footer) | Storefront layout **Missing** | B-10 |
| H-02 | Refactor 7 storefront pages to use `storefront-layout` | Per-page nav duplication | H-01 |

---

## 13. Revised Critical Path

```
A-01 → A-02 → B-01 → B-03 → B-05
                 ↓
              C-01 → C-04 → C-05 → D-01 → D-02
                 ↓
              F-01 → F-03 (admin, parallel after B-05)
                 ↓
              G-01 → G-07 (after UI stable)
```

### What Sprint 1 does **not** need to build from scratch

The audit confirms these already **Exist** as UI and only need API wiring (Phases C–D), not redesign:

- Home page and all home section components
- Products page shell and product cards (wire interactions)
- Cart page and cart line-item components
- Checkout page and all checkout form components
- Order success page layout and subcomponents
- All `storefront-*` shared components

---

## 14. Audit Method Notes

- **Searched:** `HttpClient`, `provideHttpClient`, `TranslateService`, `ngx-translate`, `guard`, `interceptor`, `environment`, `jwt-decode`, `apexcharts`, `works!`
- **Read:** All `*.routes.ts`, all routed `*page.component.ts`, all `services/*.ts`, all `layouts/*`, `app.config.ts`
- **Contract PDF** (`عقد تطوير منصة إلكترونية لبيع المنتجات الرقمية.pdf`) was not used for scope — this audit is source-code only
- **Prior plan** (`docs/plans/Frontend-Sprint1-Completion-Plan.md`) was requirement-derived; this document supersedes it for backlog prioritization

---

## 15. Related Files

| Document | Path |
|----------|------|
| This audit | `docs/audits/Frontend-Current-State.md` |
| Prior (requirement-based) plan | `docs/plans/Frontend-Sprint1-Completion-Plan.md` |
| Storefront home design plan | `docs/plans/hambox-storefront-home-implementation-plan.md` |
