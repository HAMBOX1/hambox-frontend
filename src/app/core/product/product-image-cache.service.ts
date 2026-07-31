import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ProductApiService } from '../../features/catalog/services/product-api.service';
import { resolveProductImageUrl } from '../../features/catalog/utils/product-image.utils';
import { productPlaceholderImage } from '../../features/home/utils/storefront-home.mapper';

@Injectable({ providedIn: 'root' })
export class ProductImageCacheService {
  private readonly productApi = inject(ProductApiService);
  private readonly cache = new Map<string, string>();
  private readonly pending = new Map<string, Promise<string>>();

  async resolveImageUrl(productId: string, index = 0): Promise<string> {
    const cached = this.cache.get(productId);
    if (cached) {
      return cached;
    }

    const inflight = this.pending.get(productId);
    if (inflight) {
      return inflight;
    }

    const request = this.fetchImageUrl(productId, index).finally(() => {
      this.pending.delete(productId);
    });

    this.pending.set(productId, request);
    return request;
  }

  async resolveMany(
    productIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>> {
    const unique = [...new Set(productIds)];
    await Promise.all(unique.map((id, index) => this.resolveImageUrl(id, index)));

    const map = new Map<string, string>();
    for (const id of unique) {
      const url = this.cache.get(id);
      if (url) {
        map.set(id, url);
      }
    }

    return map;
  }

  private async fetchImageUrl(productId: string, index: number): Promise<string> {
    try {
      const product = await firstValueFrom(this.productApi.getProductById(productId));
      const resolved = resolveProductImageUrl(product.displayImageUrl) || productPlaceholderImage(index);

      this.cache.set(productId, resolved);
      return resolved;
    } catch {
      const fallback = productPlaceholderImage(index);
      this.cache.set(productId, fallback);
      return fallback;
    }
  }
}
