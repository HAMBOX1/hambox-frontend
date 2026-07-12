import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { StorefrontProductConfigurationDto } from '../../catalog/models/inventory-api.model';
import { InventoryApiService } from '../../catalog/services/inventory-api.service';

@Injectable({ providedIn: 'root' })
export class StorefrontProductEnrichmentService {
  private readonly api = inject(InventoryApiService);

  private readonly configurationsState = signal<
    Readonly<Record<string, StorefrontProductConfigurationDto>>
  >({});

  private readonly loadingIdsState = signal<ReadonlySet<string>>(new Set());

  readonly configurations = this.configurationsState.asReadonly();
  readonly loadingIds = this.loadingIdsState.asReadonly();

  getConfiguration(productId: string): StorefrontProductConfigurationDto | null {
    return this.configurationsState()[productId] ?? null;
  }

  async ensureLoaded(productIds: readonly string[]): Promise<void> {
    const missing = productIds.filter((id) => !this.configurationsState()[id]);
    if (!missing.length) {
      return;
    }

    this.loadingIdsState.update((current) => new Set([...current, ...missing]));

    const results = await Promise.allSettled(
      missing.map(async (productId) => {
        const configuration = await firstValueFrom(this.api.getStorefrontConfiguration(productId));
        return { productId, configuration };
      }),
    );

    const next = { ...this.configurationsState() };
    for (const result of results) {
      if (result.status === 'fulfilled') {
        next[result.value.productId] = result.value.configuration;
      }
    }

    this.configurationsState.set(next);
    this.loadingIdsState.update((current) => {
      const updated = new Set(current);
      missing.forEach((id) => updated.delete(id));
      return updated;
    });
  }
}
