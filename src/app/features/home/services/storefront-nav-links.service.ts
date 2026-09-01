import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { TranslationService } from '../../../core/i18n/translation.service';
import { NavLink } from '../models/storefront-home';
import { StorefrontNavLinkContent } from '../models/storefront-content.model';
import { STOREFRONT_PRODUCTS_NAV_LINKS } from '../../products/services/storefront-products-data';
import { StorefrontApiService } from './storefront-api.service';

/**
 * Overlays the admin-editable label/visibility (Platform Settings → Storefront →
 * navigationLinks) onto the static nav structure (route/section, fixed for filtering logic on
 * the products page — see `resolveNavSection`). Falls back to the built-in `labelKey` translation
 * until the dynamic content has loaded, so the header never renders empty.
 */
@Injectable({ providedIn: 'root' })
export class StorefrontNavLinksService {
  private readonly api = inject(StorefrontApiService);
  private readonly translation = inject(TranslationService);

  private readonly dynamicLinks = signal<readonly StorefrontNavLinkContent[] | null>(null);
  private loaded = false;

  readonly links = computed<readonly NavLink[]>(() => {
    const dynamic = this.dynamicLinks();
    const lang = this.translation.language();

    return STOREFRONT_PRODUCTS_NAV_LINKS.map((base) => {
      const override = dynamic?.find((d) => d.id === base.section);
      if (!override) {
        return base;
      }
      if (!override.visible) {
        return null;
      }
      return {
        ...base,
        label: lang === 'ar' ? override.labelAr : override.labelEn,
      };
    }).filter((item): item is NavLink => item !== null);
  });

  constructor() {
    this.load();
  }

  private load(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;

    void firstValueFrom(this.api.getContent())
      .then((content) => this.dynamicLinks.set(content.navigationLinks))
      .catch(() => {
        this.loaded = false;
      });
  }
}
