import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { TranslationService } from '../../../core/i18n/translation.service';
import { Product } from '../../catalog/models/product.model';
import { ProductApiService } from '../../catalog/services/product-api.service';
import { FlashDeal } from '../models/storefront-home';
import { SectionProductRotation, SectionProductsConfig } from '../section-registry/models/section-common.model';
import { mapProductToFlashDeal } from '../utils/storefront-home.mapper';

/** How many products to pull from a category / collection before rotating through them. */
const POOL_SIZE = 100;

/** Small deterministic PRNG (mulberry32) so "daily" rotation is stable within a day but changes tomorrow. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks `limit` items from `pool`: the first ones, a per-day shuffle, or a fresh shuffle every time. */
export function pickRotated<T>(
  pool: readonly T[],
  limit: number,
  rotation: SectionProductRotation,
  now: Date = new Date(),
): T[] {
  if (rotation === 'none' || pool.length <= limit) {
    return pool.slice(0, limit);
  }

  const random =
    rotation === 'daily'
      ? seededRandom(Math.floor(now.getTime() / 86_400_000))
      : Math.random;

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, limit);
}

/**
 * Resolves the products a Page Builder "Products" section should show when its admin picked a source other than
 * the default featured set: hand-picked products, or a category / internal category with a limit and rotation.
 */
@Injectable({ providedIn: 'root' })
export class SectionProductSourceService {
  private readonly productApi = inject(ProductApiService);
  private readonly translation = inject(TranslationService);

  /**
   * Returns the section's products, or `null` to keep the platform default (also when a lookup fails: a broken
   * source must never blank a section that has perfectly good default content).
   */
  async resolve(config: SectionProductsConfig, defaults: readonly FlashDeal[]): Promise<readonly FlashDeal[] | null> {
    const lang = this.translation.language();

    try {
      if (config.source === 'auto') {
        return config.rotation === 'none' && defaults.length <= config.limit
          ? null
          : pickRotated(defaults, config.limit, config.rotation);
      }

      let products: readonly Product[] = [];

      if (config.source === 'manual') {
        const found = await Promise.all(
          config.productIds.map((id) => firstValueFrom(this.productApi.getProductById(id)).catch(() => null)),
        );
        products = found.filter((product): product is Product => !!product && product.status === 'Active');
        // Hand-picked means exactly what was picked; only the limit applies.
        return products.slice(0, config.limit).map((product, index) => mapProductToFlashDeal(product, lang, index));
      }

      if (config.source === 'category' && config.categoryIds.length > 0) {
        const pages = await Promise.all(
          config.categoryIds.map((categoryId) =>
            firstValueFrom(
              this.productApi.getProducts({ pageNumber: 1, pageSize: POOL_SIZE, status: 'Active', categoryId, sortBy: 'Newest' }),
            ),
          ),
        );
        const unique = new Map<string, Product>();
        for (const page of pages) {
          for (const product of page.items) {
            unique.set(product.id, product);
          }
        }
        products = [...unique.values()];
      } else if (config.source === 'internal' && config.collectionId) {
        const page = await firstValueFrom(
          this.productApi.getProducts({
            pageNumber: 1,
            pageSize: POOL_SIZE,
            status: 'Active',
            collectionId: config.collectionId,
            sortBy: 'Newest',
          }),
        );
        products = page.items;
      } else {
        return null;
      }

      return pickRotated(products, config.limit, config.rotation).map((product, index) =>
        mapProductToFlashDeal(product, lang, index),
      );
    } catch {
      return null;
    }
  }
}
