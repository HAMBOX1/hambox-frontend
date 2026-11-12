import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { SETTINGS_API } from '../api/api-endpoints';

interface PublicBrandingResponse {
  readonly branding?: { readonly logoUrl?: string | null };
}

const STORAGE_KEY = 'hambox.brand.logoUrl';

/**
 * The store logo picked in Admin → Settings → Branding. When none is set the header shows the live-text
 * HAMBOX wordmark instead (see `BrandWordmarkComponent`). The last known value is kept in localStorage so a
 * returning visitor does not see the text flash before the image appears.
 */
@Injectable({ providedIn: 'root' })
export class BrandLogoService {
  private readonly api = inject(ApiClientService);

  private readonly logoUrlState = signal<string | null>(this.readStored());
  private loadStarted = false;

  /** The uploaded logo's URL, or null when the text wordmark should be shown. */
  readonly logoUrl = this.logoUrlState.asReadonly();

  /** Fetches the setting once per page load; safe to call from every component that shows the brand. */
  ensureLoaded(): void {
    if (this.loadStarted) {
      return;
    }
    this.loadStarted = true;
    void this.load();
  }

  /** Lets the admin Branding settings page show a change right away without a reload. */
  set(logoUrl: string | null): void {
    this.apply(logoUrl);
  }

  private async load(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.get<PublicBrandingResponse>(SETTINGS_API.publicSettings));
      this.apply(response.branding?.logoUrl ?? null);
    } catch {
      // Keep whatever was last known (stored value or the text wordmark) when the settings call fails.
    }
  }

  private apply(logoUrl: string | null | undefined): void {
    const value = logoUrl && logoUrl.trim() ? logoUrl.trim() : null;
    this.logoUrlState.set(value);
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY, value);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage can be unavailable (private mode); the value still applies for this page view.
    }
  }

  private readStored(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
