import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { PAGE_BUILDER_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { LandingPageSectionEntry, PublishedLandingPageResponse } from '../models/landing-page-section.model';

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
}
