import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CATALOG_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { StorefrontContent } from '../models/storefront-content.model';

@Injectable({
  providedIn: 'root',
})
export class StorefrontApiService {
  private readonly api = inject(ApiClientService);

  getContent(): Observable<StorefrontContent> {
    return this.api.get<StorefrontContent>(CATALOG_API.storefrontContent);
  }
}
