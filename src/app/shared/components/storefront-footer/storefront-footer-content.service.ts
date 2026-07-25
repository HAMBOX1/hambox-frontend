import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { StorefrontApiService } from '../../../features/home/services/storefront-api.service';
import { StorefrontFooterContent } from '../../../features/home/models/storefront-content.model';

/**
 * Fallback source for `StorefrontFooterComponent` on pages that don't already fetch full
 * storefront content (products, product-details, cart, checkout, legal, ...). The home page
 * still passes its own `[footer]` input, which takes priority over this.
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
