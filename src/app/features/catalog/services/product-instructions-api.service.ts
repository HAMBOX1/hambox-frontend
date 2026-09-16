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

  get(productId: string, variantId?: string | null): Observable<ProductInstructionsDto> {
    return this.api.get<ProductInstructionsDto>(CATALOG_API.productInstructions(productId), {
      params: this.variantParams(variantId),
    });
  }

  save(productId: string, request: SaveProductInstructionsRequest, variantId?: string | null): Observable<ProductInstructionsDto> {
    return this.api.put<ProductInstructionsDto>(CATALOG_API.productInstructions(productId), request, {
      params: this.variantParams(variantId),
    });
  }

  publish(productId: string, variantId?: string | null): Observable<ProductInstructionsDto> {
    return this.api.post<ProductInstructionsDto>(CATALOG_API.productInstructionsPublish(productId), {}, {
      params: this.variantParams(variantId),
    });
  }

  unpublish(productId: string, variantId?: string | null): Observable<ProductInstructionsDto> {
    return this.api.post<ProductInstructionsDto>(CATALOG_API.productInstructionsUnpublish(productId), {}, {
      params: this.variantParams(variantId),
    });
  }

  private variantParams(variantId?: string | null): Record<string, string> {
    return variantId ? { variantId } : {};
  }

  uploadImage(productId: string, file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.post<{ url: string }>(CATALOG_API.productInstructionsImages(productId), formData);
  }
}
