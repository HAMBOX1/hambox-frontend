import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { FAQ_API } from '../api/api-endpoints';
import { FaqCategoryDto, FaqScope, PublicFaqDto } from './faq-public.model';

/**
 * Stateless reads of published FAQ data — shared by the `/faq` hub page and the Page Builder FAQ
 * section (product/category marketing pages, home page). No internal signal state on purpose: each
 * consumer holds its own result (a page-local signal or `SectionRenderContext`), since a shared
 * cached signal would race between concurrently-rendered scopes (e.g. a product page and the FAQ
 * hub both mounted via `NgComponentOutlet` preview).
 */
@Injectable({ providedIn: 'root' })
export class FaqPublicService {
  private readonly api = inject(ApiClientService);

  async getPublished(scope: FaqScope = 'Global', targetId?: string | null): Promise<readonly PublicFaqDto[]> {
    try {
      const items = await firstValueFrom(
        this.api.get<PublicFaqDto[]>(FAQ_API.published, {
          params: {
            scope,
            ...(targetId ? { targetId } : {}),
          },
        }),
      );
      return items ?? [];
    } catch {
      return [];
    }
  }

  async getCategories(): Promise<readonly FaqCategoryDto[]> {
    try {
      const items = await firstValueFrom(this.api.get<FaqCategoryDto[]>(FAQ_API.publicCategories));
      return items ?? [];
    } catch {
      return [];
    }
  }
}
