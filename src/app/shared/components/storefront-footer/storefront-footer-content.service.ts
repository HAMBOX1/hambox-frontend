import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { StorefrontApiService } from '../../../features/home/services/storefront-api.service';
import { StorefrontFooterContent } from '../../../features/home/models/storefront-content.model';

/**
 * Fallback source for `StorefrontFooterComponent` on pages that don't already fetch full
 * storefront content (products, product-details, cart, checkout, legal, ...). The home page
 * still passes its own `[footer]` input, which takes priority over this.
 *
 * Page Builder phase 2 note: the new `GET /page-builder/published/footer` endpoint only carries
 * ordering/visibility for the Footer section — every seeded section's `configJson` is still the
 * empty-placeholder `"{}"` (real field values land in a later phase). So this stays on the old
 * `getContent()` call for actual footer field values; switching to the new endpoint today would
 * just render an empty footer for no behavioral gain.
 */
@Injectable({ providedIn: 'root' })
export class StorefrontFooterContentService {
  private readonly api = inject(StorefrontApiService);

  private readonly footerState = signal<StorefrontFooterContent | null>(null);
  readonly footer = this.footerState.asReadonly();

  private loaded = false;

  load(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;

    void firstValueFrom(this.api.getContent())
      .then((content) => this.footerState.set(content.footer))
      .catch(() => {
        this.loaded = false;
      });
  }
}
