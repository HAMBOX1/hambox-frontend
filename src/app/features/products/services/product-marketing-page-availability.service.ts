import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PageBuilderPublicApiService } from '../../home/services/page-builder-public-api.service';

/**
 * Tracks which product ids have a published marketing page, via one batched request per unresolved
 * set of ids — mirrors `StorefrontProductEnrichmentService`'s cache-signal shape so callers (product
 * list facades/components) follow the same pattern already used for variant/stock enrichment.
 */
@Injectable({ providedIn: 'root' })
export class ProductMarketingPageAvailabilityService {
  private readonly api = inject(PageBuilderPublicApiService);

  private readonly availableState = signal<ReadonlySet<string>>(new Set());
  /** Ids already resolved (whether available or not) — avoids re-querying the same id twice. */
  private readonly checkedState = signal<ReadonlySet<string>>(new Set());

  readonly available = this.availableState.asReadonly();

  hasMarketingPage(productId: string): boolean {
    return this.availableState().has(productId);
  }

  async ensureLoaded(productIds: readonly string[]): Promise<void> {
    const checked = this.checkedState();
    const missing = [...new Set(productIds)].filter((id) => !checked.has(id));
    if (!missing.length) {
      return;
    }

    const found = await firstValueFrom(this.api.getProductMarketingAvailability(missing));

    this.availableState.update((current) => new Set([...current, ...found]));
    this.checkedState.update((current) => new Set([...current, ...missing]));
  }
}
