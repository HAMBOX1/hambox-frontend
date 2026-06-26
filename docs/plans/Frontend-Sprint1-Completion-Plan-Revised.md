# HAMBOX Frontend — Sprint 1 Completion Plan (Revised)

**Date:** 2026-06-24  
**Basis:** Code audit in [`docs/audits/Frontend-Current-State.md`](../audits/Frontend-Current-State.md)  
**Supersedes:** `docs/plans/Frontend-Sprint1-Completion-Plan.md` (requirement-derived estimate)

This plan lists **only missing or partial functionality** found in source code. No new features beyond what routes/scaffolds already imply.

---

## Audit snapshot

| Metric | Count |
|--------|-------|
| Routed pages with full UI | 6 (+ 3 partial) |
| Routed stub pages | 8 |
| Pages on real APIs | **0** |
| Layouts (storefront/admin) | **0** (2 partial shells only) |
| Admin components wired | **0** of 4 |
| Localization configured | **0** |

---

## Phase A — Core wiring

| ID | Task | Gap |
|----|------|-----|
| A-01 | Environment files + `apiUrl` | Missing |
| A-02 | `provideHttpClient()` | Missing |
| A-03 | `src/app/core/` API helpers | Missing |
| A-04 | `provideAnimations()` + `providePrimeNG()` | Missing |

## Phase B — Authentication

| ID | Task | Gap |
|----|------|-----|
| B-01 | `Auth` service (API) | Missing |
| B-02 | Auth models/DTOs | Missing |
| B-03 | Token storage + `jwt-decode` session | Missing |
| B-04 | Auth + error interceptors | Missing |
| B-05 | `authGuard`, `guestGuard`, `adminGuard` | Missing |
| B-06 | Login page UI | Missing (stub) |
| B-07 | Register page UI | Missing (stub) |
| B-08 | Branded auth layout | Partial |
| B-09 | Guard protected routes | Missing |
| B-10 | Dynamic guest/user nav | Missing |

## Phase C — Storefront API (mock → live)

| ID | Task | Gap |
|----|------|-----|
| C-01 | `Products` service | Missing |
| C-02 | Wire products page + filters/sort | Mock + Partial |
| C-03 | Pagination / load more | Partial |
| C-04 | `products/:id` route | Missing |
| C-05 | `ProductDetails` service | Missing |
| C-06 | PDP cart/buy actions | Partial |
| C-07 | `Home` service | Missing |
| C-08 | Search → query params | Missing |
| C-09 | Product card → PDP links | Missing |
| C-10 | Wire `loading-skeleton` / `empty-state` | Partial (unwired) |

## Phase D — Cart & checkout API

| ID | Task | Gap |
|----|------|-----|
| D-01 | `Cart` API sync | Mock |
| D-02 | Checkout submit API | Partial |
| D-03 | Real payment status polling | Partial |
| D-04 | Order success from API | Mock |
| D-05 | Discount API or remove stub | Partial |

## Phase E — Account

| ID | Task | Gap |
|----|------|-----|
| E-01 | Profile page + `Profile` service | Missing (stub) |
| E-02 | Customer orders + `Orders` service | Missing (stub) |

**Not in scope (no UI exists):** favorites, support-chat

## Phase F — Admin

| ID | Task | Gap |
|----|------|-----|
| F-01 | `admin-layout` + wire sidebar/topbar/navbar | Missing / Partial |
| F-02 | `/admin/**` routes + `adminGuard` | Missing |
| F-03 | Dashboard page + service + charts | Missing (stub) |
| F-04 | Orders admin page + service | Missing (stub) |
| F-05 | Customers page + service | Missing (stub) |
| F-06 | Inventory page + service | Missing (stub) |
| F-07 | Admin domain models | Missing (empty interfaces) |
| F-08 | Table export (`xlsx`/`file-saver`) | Missing (unused packages) |

## Phase G — Localization

| ID | Task | Gap |
|----|------|-----|
| G-01 | Configure `ngx-translate` | Missing |
| G-02 | `assets/i18n/*.json` | Missing |
| G-03 | `LanguageService` + switcher component | Missing |
| G-04 | Wire nav language buttons | Partial |
| G-05 | `CurrencyService` + pipe + wire buttons | Missing |
| G-06 | RTL support | Missing |
| G-07 | Externalize storefront strings | Missing |
| G-08 | `Accept-Language` interceptor | Missing |

## Phase H — Layout (optional)

| ID | Task | Gap |
|----|------|-----|
| H-01 | `storefront-layout` | Missing |
| H-02 | Refactor pages to use it | Partial (duplicated nav) |

---

## Dependency order

```
A → B → C → D
         ↘
          F (after B-05)
G (after A-02; string pass after C/D UI stable)
H (after B-10, optional)
```

## Already built — wire only, do not redesign

- Home + 7 section components
- Products page shell + 5 subcomponents
- Cart page + 2 subcomponents
- Checkout (3 pages) + 10 subcomponents
- 7 storefront shared components

See full per-file status tables in the audit document.
