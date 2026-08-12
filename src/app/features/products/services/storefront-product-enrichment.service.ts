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
    const missing = [...new Set(productIds)].filter((id) => !this.configurationsState()[id]);
    if (!missing.length) {
      return;
    }

    this.loadingIdsState.update((current) => new Set([...current, ...missing]));

    try {
      const configurations = await firstValueFrom(this.api.getStorefrontConfigurations(missing));

      const next = { ...this.configurationsState() };
      for (const configuration of configurations) {
        next[configuration.productId] = configuration;
      }

      this.configurationsState.set(next);
    } finally {
      this.loadingIdsState.update((current) => {
        const updated = new Set(current);
        missing.forEach((id) => updated.delete(id));
        return updated;
      });
    }
  }
}
