import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { CATALOG_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { StorefrontContent } from '../models/storefront-content.model';

interface StorefrontContentResponse {
  readonly hero: {
    readonly eyebrow: string;
    readonly titleLine1: string;
    readonly titleAccent: string;
    readonly description: string;
    readonly backgroundImageUrl: string;
    readonly overlayImageUrl: string;
    readonly primaryCtaLabel: string;
    readonly primaryCtaRoute: string;
    readonly secondaryCtaLabel: string;
    readonly secondaryCtaRoute: string;
  };
  readonly promoBanner: {
    readonly headline: string;
    readonly subheadline: string;
    readonly backgroundImageUrl: string;
    readonly countdownSeconds: number;
  };
  readonly flashDealsCountdownSeconds: number;
}

@Injectable({
  providedIn: 'root',
})
export class StorefrontApiService {
  private readonly api = inject(ApiClientService);

  getContent(): Observable<StorefrontContent> {
    return this.api
      .get<StorefrontContentResponse>(CATALOG_API.storefrontContent)
      .pipe(map((response) => this.mapContent(response)));
  }

  private mapContent(response: StorefrontContentResponse): StorefrontContent {
    return {
      hero: {
        eyebrow: response.hero.eyebrow,
        titleLine1: response.hero.titleLine1,
        titleAccent: response.hero.titleAccent,
        description: response.hero.description,
        backgroundImageUrl: response.hero.backgroundImageUrl,
        overlayImageUrl: response.hero.overlayImageUrl,
        primaryCtaLabel: response.hero.primaryCtaLabel,
        primaryCtaRoute: response.hero.primaryCtaRoute,
        secondaryCtaLabel: response.hero.secondaryCtaLabel,
        secondaryCtaRoute: response.hero.secondaryCtaRoute,
      },
      promoBanner: {
        headline: response.promoBanner.headline,
        subheadline: response.promoBanner.subheadline,
        backgroundImageUrl: response.promoBanner.backgroundImageUrl,
        countdownSeconds: response.promoBanner.countdownSeconds,
      },
      flashDealsCountdownSeconds: response.flashDealsCountdownSeconds,
    };
  }
}
