import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { PAGE_BUILDER_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { ApiError } from '../../../core/models/api-error.model';
import {
  LandingPageSectionEntry,
  PublishedLandingPageResponse,
} from '../models/landing-page-section.model';

@Injectable({
  providedIn: 'root',
})
export class PageBuilderPublicApiService {
  private readonly api = inject(ApiClientService);

  getPublishedSections(): Observable<PublishedLandingPageResponse> {
    return this.api.get<PublishedLandingPageResponse>(PAGE_BUILDER_API.published);
  }

  getPublishedFooter(): Observable<LandingPageSectionEntry | null> {
    return this.api.get<LandingPageSectionEntry | null>(PAGE_BUILDER_API.publishedFooter);
  }

  /** Null means "no published marketing page for this product" — the normal, common case, not an error. */
  getPublishedForProduct(productId: string): Observable<PublishedLandingPageResponse | null> {
    return this.api
      .get<PublishedLandingPageResponse>(PAGE_BUILDER_API.publishedForProduct(productId))
      .pipe(catchError((err) => this.nullOn404(err)));
  }

  /** Null means "no published marketing page for this category" — the normal, common case, not an error. */
  getPublishedForCategory(categoryId: string): Observable<PublishedLandingPageResponse | null> {
    return this.api
      .get<PublishedLandingPageResponse>(PAGE_BUILDER_API.publishedForCategory(categoryId))
      .pipe(catchError((err) => this.nullOn404(err)));
  }

  /** Of the given product ids, which have a published Product-scoped marketing page? Single batched
   * request — used to decide whether to show a "discover" icon on a product card. */
  getProductMarketingAvailability(productIds: readonly string[]): Observable<readonly string[]> {
    if (!productIds.length) {
      return of([]);
    }

    let params = new HttpParams();
    for (const id of productIds) {
      params = params.append('ids', id);
    }

    return this.api.get<readonly string[]>(PAGE_BUILDER_API.productAvailability, { params });
  }

  private nullOn404(err: unknown): Observable<null> {
    if (err instanceof ApiError && err.status === 404) {
      return of(null);
    }
    throw err;
  }
}
