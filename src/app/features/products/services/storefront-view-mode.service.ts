import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { SETTINGS_API } from '../../../core/api/api-endpoints';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { MembershipFeatureService } from '../../../core/membership/membership-feature.service';

export type StorefrontViewMode = 'comfortable' | 'compact' | 'dense' | 'list';

/** Every way the products page can be laid out, in the order the switcher shows them. */
export const ALL_VIEW_MODES: readonly StorefrontViewMode[] = ['comfortable', 'compact', 'dense', 'list'];

/** Which layouts each kind of customer may use, as set by the admin (Settings → General). */
export interface ProductViewSettings {
  readonly regularViews?: readonly string[] | null;
  readonly regularDefault?: string | null;
  readonly eliteViews?: readonly string[] | null;
  readonly eliteDefault?: string | null;
}

const STORAGE_KEY = 'hambox.storefront.viewMode';
const SETTINGS_STORAGE_KEY = 'hambox.storefront.viewSettings';

function isViewMode(value: unknown): value is StorefrontViewMode {
  return typeof value === 'string' && (ALL_VIEW_MODES as readonly string[]).includes(value);
}

/**
 * The layouts a customer may use and the one they see now.
 *
 * - Nothing configured yet: everyone gets all four, exactly like before.
 * - A configured list is cut down to valid layouts (kept in the switcher's order); an empty or invalid list falls back to
 *   the comfortable grid so the page always has a layout.
 * - Elite customers (an active membership) use the Elite list, everyone else the regular list.
 * - The layout is the customer's own pick when it is still allowed, otherwise the group's default (when allowed), otherwise
 *   the first allowed layout.
 */
export function resolveProductViews(
  settings: ProductViewSettings | null,
  elite: boolean,
  chosen: StorefrontViewMode | null,
): { readonly allowed: readonly StorefrontViewMode[]; readonly mode: StorefrontViewMode } {
  const configured = elite ? settings?.eliteViews : settings?.regularViews;
  const requestedDefault = elite ? settings?.eliteDefault : settings?.regularDefault;

  const allowed: readonly StorefrontViewMode[] = Array.isArray(configured)
    ? ALL_VIEW_MODES.filter((mode) => configured.includes(mode))
    : ALL_VIEW_MODES;
  const usable = allowed.length > 0 ? allowed : (['comfortable'] as const);

  if (chosen && usable.includes(chosen)) {
    return { allowed: usable, mode: chosen };
  }

  const fallback = isViewMode(requestedDefault) && usable.includes(requestedDefault) ? requestedDefault : usable[0];
  return { allowed: usable, mode: fallback };
}

@Injectable({ providedIn: 'root' })
export class StorefrontViewModeService {
  private readonly api = inject(ApiClientService);
  private readonly membership = inject(MembershipFeatureService);
  private readonly session = inject(AuthSessionService);

  private readonly chosenState = signal<StorefrontViewMode | null>(this.readChosen());
  private readonly settingsState = signal<ProductViewSettings | null>(this.readStoredSettings());
  private loadStarted = false;

  private readonly elite = computed(() => this.session.isCustomerAuthenticated() && this.membership.isMember());
  private readonly resolved = computed(() => resolveProductViews(this.settingsState(), this.elite(), this.chosenState()));

  /** The layout the products page shows right now. */
  readonly mode = computed(() => this.resolved().mode);

  /** The layouts this customer may pick between; the switcher hides itself when there is only one. */
  readonly allowedModes = computed(() => this.resolved().allowed);

  /** Reads the admin's layout settings once per page load; safe to call from every component that needs them. */
  ensureLoaded(): void {
    if (this.loadStarted) {
      return;
    }
    this.loadStarted = true;
    void this.load();
  }

  setMode(mode: StorefrontViewMode): void {
    if (!this.allowedModes().includes(mode)) {
      return;
    }

    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    this.chosenState.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Private mode: the pick lasts for this page view only.
    }
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0 });
      });
    }
  }

  private async load(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.get<{ readonly general?: Record<string, unknown> | null }>(SETTINGS_API.publicSettings),
      );
      const general = response.general ?? {};
      const settings: ProductViewSettings = {
        regularViews: asList(general['regularProductViews']),
        regularDefault: asText(general['regularDefaultProductView']),
        eliteViews: asList(general['eliteProductViews']),
        eliteDefault: asText(general['eliteDefaultProductView']),
      };
      this.settingsState.set(settings);
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Not worth failing over: the next visit simply fetches them again.
      }
    } catch {
      // Keep the last known settings (or "everything allowed") when the call fails.
    }
  }

  private readChosen(): StorefrontViewMode | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // 'large' is a legacy stored value from before the comfortable/compact rename.
      if (stored === 'large') {
        return 'comfortable';
      }
      return isViewMode(stored) ? stored : null;
    } catch {
      return null;
    }
  }

  private readStoredSettings(): ProductViewSettings | null {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ProductViewSettings) : null;
    } catch {
      return null;
    }
  }
}

function asList(value: unknown): readonly string[] | null {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null;
}

function asText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
