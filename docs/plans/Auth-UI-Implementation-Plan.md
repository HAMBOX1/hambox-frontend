# Auth UI — Implementation Plan

**Date:** 2026-06-24  
**Figma reference:** HAMBOX file `ZKBsh3DmCbtUvJ2X8joHfO`, node `4:520` (Authentication section)  
**Prerequisite:** Phase A/B foundation (`Auth`, `AuthSessionService`, guards, interceptors)

---

## 1. Scope

| ID | Task |
|----|------|
| B-06 | Login page UI |
| B-07 | Register page UI |
| B-08 | Branded auth layout |
| B-09 | Apply `authGuard` / `guestGuard` on routes |
| B-10 | Dynamic guest/user storefront navigation |
| + | Forgot password, reset password, verify email, resend verification pages |

**Out of scope:** Catalog APIs, localization, admin UI.

---

## 2. Visual direction

Match existing storefront tokens (`_storefront-tokens.scss`):

- Dark base `#131314`, glass card surfaces, neon green accent `#50ed95`
- Typography: Sora (headings), Manrope (body)
- PrimeNG inputs/buttons styled via auth SCSS using `--sf-*` variables
- Auth layout: split panel (brand left, form right); stacks on mobile

---

## 3. File plan

### Layout

| File | Purpose |
|------|---------|
| `layouts/auth-layout/auth-layout.component.html` | Split-panel shell, logo, outlet |
| `layouts/auth-layout/auth-layout.component.scss` | Auth layout styles |

### Shared auth utilities

| File | Purpose |
|------|---------|
| `features/auth/utils/auth-form.utils.ts` | Server validation mapping, field errors |
| `features/auth/styles/_auth-form.scss` | Shared form/card styles (imported per page) |

### Pages (each: `.component.ts/html/scss`)

| Route | Component |
|-------|-----------|
| `/auth/login` | `login-page` |
| `/auth/register` | `register-page` |
| `/auth/forgot-password` | `forgot-password-page` |
| `/auth/reset-password?token=` | `reset-password-page` |
| `/auth/verify-email?token=` | `verify-email-page` |
| `/auth/resend-verification` | `resend-verification-page` |

### Navigation

| File | Purpose |
|------|---------|
| `shared/components/storefront-nav/storefront-nav.component.ts` | Switches guest/user nav via `Auth.isAuthenticated()` |
| Update storefront pages | Replace direct nav imports with `StorefrontNavComponent` |
| Update `top-nav-user` | Avatar initial from `Auth.user()` signal |

### Routing

| File | Changes |
|------|---------|
| `features/auth/auth.routes.ts` | All auth routes + `guestGuard` (except verify-email) |
| `app.routes.ts` | `authGuard` on `cart`, `checkout`, `profile`, `favorites`, `orders` |

---

## 4. Form & API behaviour

| Page | Form fields | API | Success UX |
|------|-------------|-----|------------|
| Login | email, password | `Auth.login()` | Redirect `returnUrl` or `/home` |
| Register | firstName, lastName, email, password, confirmPassword | `Auth.register()` | Success message → resend verification link |
| Forgot password | email | `Auth.forgotPassword()` | Neutral success message |
| Reset password | newPassword, confirmPassword | `Auth.resetPassword({ token, newPassword })` | Success → login |
| Verify email | — (auto) | `Auth.verifyEmail(token)` | Success/error status card |
| Resend verification | email | `Auth.resendVerification()` | Neutral success message |

**Error handling:** `ApiError` from error interceptor → business message banner + `validationErrors` mapped to controls.

**Loading:** `isSubmitting` signal disables submit + PrimeNG button loading.

---

## 5. Guard matrix

| Route | Guard |
|-------|-------|
| `/auth/login`, `/register`, `/forgot-password`, `/reset-password`, `/resend-verification` | `guestGuard` |
| `/auth/verify-email` | None (email link may arrive anytime) |
| `/cart`, `/checkout`, `/profile`, `/favorites`, `/orders` | `authGuard` |
| `/home`, `/products`, `/product-details` | Public |

---

## 6. Verification

```bash
ng build
ng test --no-watch
```
