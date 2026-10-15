import { Injectable, signal } from '@angular/core';

export type ConsentStatus = 'unknown' | 'granted' | 'denied';

const STORAGE_KEY = 'hambox.analyticsConsent';

/**
 * The visitor's answer to "may we measure your visit?". Nothing from GA / GTM / Meta Pixel is loaded
 * until this is `granted` (audit R55); `denied` and `unknown` both mean no tracking scripts at all.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly statusState = signal<ConsentStatus>(this.read());

  readonly status = this.statusState.asReadonly();

  grant(): void {
    this.write('granted');
  }

  deny(): void {
    this.write('denied');
  }

  /** Lets the visitor change their mind (e.g. from the footer) — clears the stored answer. */
  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable (private mode); the in-memory answer is still reset below.
    }

    this.statusState.set('unknown');
  }

  private read(): ConsentStatus {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'granted' || stored === 'denied' ? stored : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private write(status: ConsentStatus): void {
    try {
      localStorage.setItem(STORAGE_KEY, status);
    } catch {
      // Not persisted, still honoured for this page view.
    }

    this.statusState.set(status);
  }
}
