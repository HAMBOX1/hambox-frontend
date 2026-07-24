import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { CATALOG_API } from '../../../core/api/api-endpoints';
import { ProductInstructionsDto, SaveProductInstructionsRequest } from '../models/product-instructions.model';

@Injectable({
  providedIn: 'root',
})
export class ProductInstructionsApiService {
  private readonly api = inject(ApiClientService);

  get(productId: string): Observable<ProductInstructionsDto> {
    return this.api.get<ProductInstructionsDto>(CATALOG_API.productInstructions(productId));
  }

  save(productId: string, request: SaveProductInstructionsRequest): Observable<ProductInstructionsDto> {
    return this.api.put<ProductInstructionsDto>(CATALOG_API.productInstructions(productId), request);
  }

  publish(productId: string): Observable<ProductInstructionsDto> {
    return this.api.post<ProductInstructionsDto>(CATALOG_API.productInstructionsPublish(productId), {});
  }

  unpublish(productId: string): Observable<ProductInstructionsDto> {
    return this.api.post<ProductInstructionsDto>(CATALOG_API.productInstructionsUnpublish(productId), {});
  }

  uploadImage(productId: string, file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.post<{ url: string }>(CATALOG_API.productInstructionsImages(productId), formData);
  }
}
