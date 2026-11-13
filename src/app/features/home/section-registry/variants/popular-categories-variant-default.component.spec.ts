import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TranslationService } from '../../../../core/i18n/translation.service';
import { CategoryApiService } from '../../../catalog/services/category-api.service';
import { PopularCategoriesSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';
import { PopularCategoriesVariantDefaultComponent } from './popular-categories-variant-default.component';

const storeCategory = (n: number) => ({ id: `s${n}`, title: `Store ${n}`, subtitle: '', imageUrl: '', route: '/products' });
const apiCategory = (id: string, name: string) => ({ id, nameEn: name, nameAr: name, imageUrl: null, parentId: null });

const context = {
  content: {},
  categories: [storeCategory(1), storeCategory(2)],
  featuredProducts: [
    { id: 'p1', title: 'Xbox Game Pass', subtitle: 'Game Keys', imageUrl: '/x.png', discountLabel: '', originalPriceUsd: 0, currentPriceUsd: 5, priceTone: 'default' },
  ],
  featuredHighlight: null,
  trendingRanks: [],
  trendingValue: null,
  trustFeatures: [],
  flashCountdownSeconds: 0,
} as unknown as SectionRenderContext;

function create(config: Partial<PopularCategoriesSectionConfig>, getCategories: () => unknown) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: CategoryApiService, useValue: { getCategories } },
      { provide: TranslationService, useValue: { language: () => 'en' } },
    ],
  });
  const fixture = TestBed.createComponent(PopularCategoriesVariantDefaultComponent);
  fixture.componentRef.setInput('context', context);
  fixture.componentRef.setInput('config', { sectionTitle: 'T', maximumCategories: 6, sortOrder: 'manual', ...config });
  fixture.detectChanges();
  return fixture;
}

const titles = (fixture: ReturnType<typeof create>) =>
  (fixture.componentInstance as unknown as { tiles: () => { title: string; route: string }[] }).tiles();

describe('PopularCategoriesVariantDefaultComponent', () => {
  it('shows the store categories by default', () => {
    const fixture = create({}, () => of({ items: [] }));

    expect(titles(fixture).map((t) => t.title)).toEqual(['Store 1', 'Store 2']);
  });

  it('shows the chosen products as tiles linking to their pages', () => {
    const fixture = create({ contentType: 'products' }, () => of({ items: [] }));

    expect(titles(fixture)).toEqual([expect.objectContaining({ title: 'Xbox Game Pass', route: '/products/p1' })]);
  });

  it('shows only the picked categories, in the order they were picked', async () => {
    const fixture = create(
      { categoryIds: ['c3', 'c1'] },
      () => of({ items: [apiCategory('c1', 'One'), apiCategory('c2', 'Two'), apiCategory('c3', 'Three')] }),
    );
    await new Promise((resolve) => setTimeout(resolve));

    expect(titles(fixture).map((t) => t.title)).toEqual(['Three', 'One']);
    expect(titles(fixture)[0].route).toBe('/products?category=c3');
  });

  it('falls back to the store categories when the picked ones cannot be loaded', async () => {
    const fixture = create({ categoryIds: ['c1'] }, () => throwError(() => new Error('down')));
    await new Promise((resolve) => setTimeout(resolve));

    expect(titles(fixture).map((t) => t.title)).toEqual(['Store 1', 'Store 2']);
  });
});
