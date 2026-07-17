import { inject, Injectable } from '@angular/core';

import { ProductDetailsItem } from '../models/product-details';
import { mapProductToDetailsItem } from '../../products/utils/storefront-product.mapper';
import { Products } from '../../products/services/products';
import { TranslationService } from '../../../core/i18n/translation.service';

@Injectable({
  providedIn: 'root',
})
export class ProductDetails {
  private readonly products = inject(Products);
  private readonly translation = inject(TranslationService);

  async getById(id: string): Promise<ProductDetailsItem> {
    const product = await this.products.getProductById(id);

    if (product.status !== 'Active') {
      throw new Error('Product is not available on the storefront.');
    }

    return mapProductToDetailsItem(product, this.translation.language());
  }
}
