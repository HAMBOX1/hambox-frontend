import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { CATALOG_API } from '../../../core/api/api-endpoints';

interface CategoryIconRow {
  readonly id: string;
  readonly iconUrl?: string | null;
}

interface CategoryPage {
  readonly items?: readonly CategoryIconRow[];
}

/**
 * The small icon the admin gave each category (a platform logo, for example), shown on product cards. Loaded once for
 * the whole storefront; a category without an icon simply has none, and a failed load leaves the cards as they were.
 */
@Injectable({ providedIn: 'root' })
export class CategoryIconService {
  private readonly api = inject(ApiClientService);

  private readonly iconsState = signal<ReadonlyMap<string, string>>(new Map());
  private loadStarted = false;

  /** Reading this from a template or computed also starts the one-time load. */
  iconFor(categoryId: string | undefined | null): string | null {
    this.ensureLoaded();
    return categoryId ? (this.iconsState().get(categoryId) ?? null) : null;
  }

  private ensureLoaded(): void {
    if (this.loadStarted) {
      return;
    }
    this.loadStarted = true;
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.api.get<CategoryPage>(CATALOG_API.categories, {
          params: { pageNumber: 1, pageSize: 200, activeOnly: true },
        }),
      );
      const map = new Map<string, string>();
      for (const row of page.items ?? []) {
        if (row.iconUrl) {
          map.set(row.id, row.iconUrl);
        }
      }
      this.iconsState.set(map);
    } catch {
      // The cards just show no icon.
    }
  }
}
