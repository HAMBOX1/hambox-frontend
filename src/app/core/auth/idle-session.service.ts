import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthSessionService } from './auth-session.service';
import { SessionBootstrapService } from './session-bootstrap.service';
import { AdminAuth } from '../../features/auth/services/admin-auth';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
const CHECK_INTERVAL_MS = 15_000;

/**
 * Admin-only idle-session UX: tracks real user interaction (mouse/keyboard/scroll/touch) in the
 * admin shell and shows a warning 2 minutes before the backend's idle timeout would end the
 * session, offering "Stay signed in" (a real `/api/auth/refresh` call — the same backend-enforced
 * check from RefreshTokenCommandHandler/SessionValidator decides whether that succeeds) or "Sign
 * out" (a real logout). If the admin does nothing, this signs out for them once the deadline
 * passes — the backend session is already expired by then either way (P1's idle-timeout
 * enforcement), this just gives a clean, immediate UX instead of waiting for the next organic API
 * call to 401.
 *
 * ponytail: the 30-minute timeout / 2-minute warning below are hardcoded to match
 * `AuthenticationSettingsPayload`'s defaults (`AdminIdleTimeoutMinutes`/the 2-minute warning
 * window from the product spec), not fetched from Platform Settings — there's no endpoint an
 * admin without Settings.View can read that value from today. If an operator changes
 * AdminIdleTimeoutMinutes, this warning's timing drifts from the real backend cutoff; the backend
 * check itself does not, so a stale warning is a UX rough edge, not a security gap. Upgrade path:
 * surface the real value on GET /api/auth/me (or a small dedicated endpoint) and read it here.
 */
@Injectable({
  providedIn: 'root',
})
export class IdleSessionService {
  private static readonly IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  private static readonly WARN_AFTER_MS = IdleSessionService.IDLE_TIMEOUT_MS - 2 * 60 * 1000;

  private readonly session = inject(AuthSessionService);
  private readonly bootstrap = inject(SessionBootstrapService);
  private readonly adminAuth = inject(AdminAuth);
  private readonly router = inject(Router);

  readonly showWarning = signal(false);
  readonly staying = signal(false);

  private lastActivityAt = Date.now();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listenersAttached = false;

  private readonly onActivity = (): void => {
    // Frozen once the warning is showing — only the explicit buttons count from then on, so a
    // stray mouse jiggle can't silently waive a security control the admin hasn't actually seen.
    if (this.showWarning()) {
      return;
    }

    this.lastActivityAt = Date.now();
  };

  start(): void {
    if (this.intervalId !== null) {
      return;
    }

    this.lastActivityAt = Date.now();
    this.attachActivityListeners();
    this.intervalId = setInterval(() => this.check(), CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.detachActivityListeners();
    this.showWarning.set(false);
  }

  async stayActive(): Promise<void> {
    this.staying.set(true);

    try {
      await firstValueFrom(this.bootstrap.refresh());
      this.lastActivityAt = Date.now();
      this.showWarning.set(false);
    } catch {
      // The refresh was rejected server-side (e.g. the absolute max session lifetime already
      // passed) — the auth interceptor's own 401 handling clears the session and redirects to
      // /admin/login on its next use; nothing extra to do here.
    } finally {
      this.staying.set(false);
    }
  }

  async signOutNow(): Promise<void> {
    this.showWarning.set(false);
    await firstValueFrom(this.adminAuth.logout());
    void this.router.navigate(['/admin/login']);
  }

  private check(): void {
    if (!this.session.isAdminAuthenticated()) {
      return;
    }

    const idleMs = Date.now() - this.lastActivityAt;

    if (this.showWarning()) {
      if (idleMs >= IdleSessionService.IDLE_TIMEOUT_MS) {
        void this.signOutNow();
      }

      return;
    }

    if (idleMs >= IdleSessionService.WARN_AFTER_MS) {
      this.showWarning.set(true);
    }
  }

  private attachActivityListeners(): void {
    if (this.listenersAttached) {
      return;
    }

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, this.onActivity, { passive: true });
    }

    this.listenersAttached = true;
  }

  private detachActivityListeners(): void {
    if (!this.listenersAttached) {
      return;
    }

    for (const event of ACTIVITY_EVENTS) {
      document.removeEventListener(event, this.onActivity);
    }

    this.listenersAttached = false;
  }
}
