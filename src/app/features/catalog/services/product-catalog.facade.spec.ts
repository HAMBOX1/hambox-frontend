import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CATALOG_API, SUPPLIERS_API } from '../../../core/api/api-endpoints';
import { provideApiTestBed } from '../../../testing/common-test.providers';
import { Product } from '../models/product.model';
import { ProductCatalogFacade } from './product-catalog.facade';

/** Lets a promise continuation (e.g. the clamp logic's recursive `fetchProducts` retry) run
 * before the test keeps going — plain microtasks don't advance until the synchronous test body
 * (or this) yields. */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function product(id: string): Product {
  return {
    id,
    nameAr: `منتج ${id}`,
    nameEn: `Product ${id}`,
    descriptionAr: '',
    descriptionEn: '',
    price: 10,
    status: 'Active',
    categoryId: 'cat-1',
    categoryName: 'Category',
    categoryNameAr: 'فئة',
  };
}

/** Flushes the products list request and, for a page-1 request, the two best-effort follow-up
 * calls (`mapping-status`, `status-counts`) that `fetchProducts` fires without awaiting them —
 * both only get dispatched to the mock backend once the main request's `.flush()` continuation
 * runs as a microtask, hence the `flushMicrotasks()` in between. */
async function flushProductsRequest(
  httpMock: HttpTestingController,
  response: { items: readonly Product[]; totalCount: number; pageNumber: number; pageSize: number },
): Promise<void> {
  httpMock.expectOne((r) => r.url === CATALOG_API.products).flush(response);
  await flushMicrotasks();

  if (response.items.length > 0) {
    httpMock.expectOne((r) => r.url === SUPPLIERS_API.productMappingStatus).flush({});
  }
  if (response.pageNumber === 1) {
    httpMock.expectOne((r) => r.url === CATALOG_API.productStatusCounts).flush({
      all: response.totalCount,
      draft: 0,
      active: response.totalCount,
      inactive: 0,
      archived: 0,
      pendingMerge: 0,
      favorites: 0,
    });
  }
}

describe('ProductCatalogFacade — list-state preservation (products page audit)', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      providers: [provideApiTestBed(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts with default list state on a fresh injection (no saved state)', () => {
    const facade = TestBed.inject(ProductCatalogFacade);

    expect(facade.pageNumber()).toBe(1);
    expect(facade.pageSize()).toBe(20);
    expect(facade.searchTerm()).toBe('');
    expect(facade.statusFilter()).toBe('');
    expect(facade.sortBy()).toBeNull();
    expect(facade.favoritesOnly()).toBe(false);
    expect(facade.pendingMergeOnly()).toBe(false);
    expect(facade.collectionFilter()).toBeNull();
  });

  /**
   * Regression cover for the reported bug: Favorites + page 3 + Price desc used to reset because
   * `ProductCatalogPageComponent` provided a fresh `ProductCatalogFacade` on its own `providers`
   * array, so navigating to Edit and back destroyed and recreated the facade. The fix makes the
   * facade root-scoped (`providedIn: 'root'`) — this proves two independent injections (standing
   * in for the page component being destroyed and recreated by the router) resolve to the exact
   * same instance, so state set before a "navigate away" is still there after a "navigate back".
   */
  it('preserves tab/page/sort/filter state across what would be a page-component recreation', async () => {
    const beforeNavigatingAway = TestBed.inject(ProductCatalogFacade);

    beforeNavigatingAway.setFavoritesOnly(true);
    await flushProductsRequest(httpMock, { items: [product('p1')], totalCount: 1, pageNumber: 1, pageSize: 20 });

    beforeNavigatingAway.setSort('PriceDesc');
    await flushProductsRequest(httpMock, { items: [product('p1')], totalCount: 1, pageNumber: 1, pageSize: 20 });

    beforeNavigatingAway.setPage(3, 20);
    await flushProductsRequest(httpMock, { items: [], totalCount: 0, pageNumber: 3, pageSize: 20 });

    // Stand-in for the router destroying ProductCatalogPageComponent (navigate to Edit) and
    // creating a new instance of it (navigate back) — each would call `inject(ProductCatalogFacade)`.
    const afterReturning = TestBed.inject(ProductCatalogFacade);

    expect(afterReturning).toBe(beforeNavigatingAway);
    expect(afterReturning.favoritesOnly()).toBe(true);
    expect(afterReturning.sortBy()).toBe('PriceDesc');
    expect(afterReturning.pageNumber()).toBe(3);
    expect(afterReturning.pageSize()).toBe(20);
  });

  it('clamps to the last valid page when the saved page no longer exists', async () => {
    const facade = TestBed.inject(ProductCatalogFacade);

    facade.setPage(5, 20);
    // Only 45 products remain (e.g. some were deleted/merged elsewhere) — page 5 of 20 no longer exists.
    httpMock
      .expectOne((r) => r.url === CATALOG_API.products)
      .flush({ items: [], totalCount: 45, pageNumber: 5, pageSize: 20 });

    // The clamp's retry call is a further promise continuation — let it actually run before
    // expecting the second request.
    await flushMicrotasks();

    // The facade must transparently retry at the last valid page (3) instead of showing an empty list.
    await flushProductsRequest(httpMock, {
      items: [product('p1')],
      totalCount: 45,
      pageNumber: 3,
      pageSize: 20,
    });

    expect(facade.pageNumber()).toBe(3);
    expect(facade.items().length).toBe(1);
  });

  it('restoring the page issues exactly one products request and no duplicate option lookups', async () => {
    const facade = TestBed.inject(ProductCatalogFacade);

    // Simulate categories/collections already having been loaded earlier in the session.
    const categoriesLoaded = facade.loadCategoryOptions();
    httpMock.expectOne((r) => r.url === CATALOG_API.categories).flush({ items: [], pageNumber: 1, pageSize: 100, totalCount: 0 });
    await categoriesLoaded;

    const collectionsLoaded = facade.loadCollectionOptions();
    httpMock.expectOne((r) => r.url === CATALOG_API.collections).flush({ items: [], pageNumber: 1, pageSize: 200, totalCount: 0 });
    await collectionsLoaded;

    // ngOnInit calling reload() + loadCategoryOptions()/loadCollectionOptions() again, as it does
    // every time ProductCatalogPageComponent is (re)created.
    const reloaded = facade.reload();
    void facade.loadCategoryOptions();
    void facade.loadCollectionOptions();

    await flushProductsRequest(httpMock, { items: [product('p1')], totalCount: 1, pageNumber: 1, pageSize: 20 });
    await reloaded;

    // No second category/collection HTTP call — `loadCategoryOptions`/`loadCollectionOptions` are
    // no-ops once already loaded, so httpMock.verify() in afterEach would fail here otherwise.
  });
});
