# Phase A & B — Implementation Plan

**Date:** 2026-06-24  
**Scope:** Core wiring + auth foundation (no login/register UI, no catalog, no i18n, no admin)

---

## Backend contract (from `D:\Backend\HamboxWebAPI`)

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/auth/register` | POST | `{ email, password, firstName, lastName }` | `200` empty |
| `/api/auth/login` | POST | `{ email, password }` | `{ accessToken, refreshToken, expiresAt }` |
| `/api/auth/refresh` | POST | `{ refreshToken }` | `{ accessToken, refreshToken, expiresAt }` |
| `/api/auth/logout` | POST | `{ refreshToken }` | `200` empty |

Errors: `400 { error: { code, description } }` or RFC 7807 validation `errors` object.

JWT claims: `sub`, `email`, `firstName`, `lastName`, role via `ClaimTypes.Role` (long URI in payload).

Dev API: `http://localhost:5163` — use `proxy.conf.json` for `ng serve` (backend CORS allows `:3000`, not `:4200`).

---

## File plan

### Phase A

| ID | File | Action |
|----|------|--------|
| A-01 | `src/environments/environment.ts` | Create — `apiUrl: ''` (proxy-relative) |
| A-01 | `src/environments/environment.production.ts` | Create — `apiUrl` from deploy config |
| A-01 | `angular.json` | Add `fileReplacements` + `proxyConfig` on serve |
| A-01 | `proxy.conf.json` | Proxy `/api` → `http://localhost:5163` |
| A-02 | `src/app/app.config.ts` | `provideHttpClient(withInterceptors(...))` |
| A-03 | `src/app/core/tokens/api-base-url.token.ts` | Injection token |
| A-03 | `src/app/core/api/api-endpoints.ts` | Auth path constants |
| A-03 | `src/app/core/api/api-client.service.ts` | Typed HTTP wrapper |
| A-03 | `src/app/core/models/api-error.model.ts` | Error DTOs + parser |
| A-04 | `src/app/app.config.ts` | `provideAnimationsAsync()` + `providePrimeNG()` |

### Phase B

| ID | File | Action |
|----|------|--------|
| B-02 | `src/app/features/auth/models/auth.ts` | Request/response DTOs, `UserSession`, JWT payload |
| B-03 | `src/app/core/auth/token-storage.service.ts` | localStorage persistence |
| B-03 | `src/app/core/auth/jwt-utils.ts` | Decode + role extraction |
| B-03 | `src/app/core/auth/auth-session.service.ts` | Signal-based session state |
| B-01 | `src/app/features/auth/services/auth.ts` | API methods via `ApiClientService` |
| B-04 | `src/app/core/interceptors/auth.interceptor.ts` | Bearer token + refresh on 401 |
| B-04 | `src/app/core/interceptors/error.interceptor.ts` | Normalize API errors |
| B-05 | `src/app/core/guards/auth.guard.ts` | `CanActivateFn` |
| B-05 | `src/app/core/guards/guest.guard.ts` | `CanActivateFn` |

### Out of scope (not touched)

- Login/register page templates
- Route `canActivate` wiring (B-09)
- `adminGuard`
- Nav guest/user switching (B-10)

---

## Architecture

```
app.config.ts
  ├── provideHttpClient(withInterceptors([auth, error]))
  ├── provideAnimationsAsync()
  ├── providePrimeNG()
  └── provideAppInitializer(restoreSession)

Auth (feature service)
  ├── ApiClientService → HAMBOX API
  └── AuthSessionService (signals)

auth.interceptor
  ├── attach Bearer accessToken
  └── on 401 → Auth.refresh() → retry (skip for auth endpoints)

authGuard / guestGuard
  └── read AuthSessionService.isAuthenticated()
```

---

## Verification

```bash
npm install
ng build
ng build --configuration=development
```

Fix all compile errors and address build warnings where practical.
