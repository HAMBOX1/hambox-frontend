import { Product } from '../../catalog/models/product.model';
import { mapProductToDetailsItem } from './storefront-product.mapper';

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    nameAr: 'منتج',
    nameEn: 'PUBG Mobile UC',
    descriptionAr: '',
    descriptionEn: 'Desc',
    price: 10,
    status: 'Active',
    categoryId: 'c1',
    categoryName: 'Games',
    categoryNameAr: 'ألعاب',
    displayImageUrl: '/main.png',
    ...overrides,
  }) as Product;

describe('mapProductToDetailsItem', () => {
  it('carries the product\'s own "How to use" text to the product page', () => {
    const item = mapProductToDetailsItem(product({ usageInstructionsHtml: '<p>Open the store</p>' }), 'en');

    expect(item.usageInstructionsHtml).toBe('<p>Open the store</p>');
  });

  it('has no "How to use" text when the product has none, so the page keeps the standard steps', () => {
    const item = mapProductToDetailsItem(product(), 'en');

    expect(item.usageInstructionsHtml).toBeNull();
    expect(item.redeemSteps.length).toBeGreaterThan(0);
  });

  it('lists every picture of the product for the gallery, in the order set by the admin', () => {
    const image = (id: string, displayOrder: number) => ({
      id,
      url: `/${id}.png`,
      fileName: id,
      contentType: 'image/png',
      fileSizeBytes: 1,
      displayOrder,
      isPrimary: displayOrder === 0,
    });

    const item = mapProductToDetailsItem(product({ images: [image('b', 1), image('a', 0), image('c', 2)] }), 'en');

    expect(item.galleryImages.map((url) => url.replace(/^.*\//, ''))).toEqual(['a.png', 'b.png', 'c.png']);
  });
});
