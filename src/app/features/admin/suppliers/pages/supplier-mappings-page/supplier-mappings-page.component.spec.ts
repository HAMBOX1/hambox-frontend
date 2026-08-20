import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { provideApiTestBed } from '../../../../../testing/common-test.providers';
import { SupplierMappingsPageComponent } from './supplier-mappings-page.component';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function internals(component: SupplierMappingsPageComponent): any {
  return component;
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const product = { id: 'product-1', nameEn: 'Amazon Gift Card', nameAr: '', categoryName: 'Gift Cards', price: 10, status: 'Active', categoryId: 'c1' };
const variant = { id: 'variant-1', productId: 'product-1', sku: 'AMAZON-US-10', priceOverride: 10, planId: null, comparePrice: null, sortOrder: 0, status: 'Active', isVisible: true };
const catalogItem = { externalProductId: '439685', name: 'Amazon Gift Card $10', brandName: 'Amazon', currency: 'USD', minFaceValue: 10, maxFaceValue: 10, available: true };

describe('SupplierMappingsPageComponent — new selection-based workflow', () => {
  let fixture: ComponentFixture<SupplierMappingsPageComponent>;
  let httpMock: HttpTestingController;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let c: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierMappingsPageComponent],
      providers: [
        provideApiTestBed(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'supplier-1' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierMappingsPageComponent);
    httpMock = TestBed.inject(HttpTestingController);
    c = internals(fixture.componentInstance);
    fixture.detectChanges(); // ngOnInit -> loadDetail + loadMappings

    httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/v1/suppliers/supplier-1').flush({
      id: 'supplier-1', name: 'Bamboo', code: 'BAMBOO', providerType: 'Bamboo', status: 'Active', priority: 100,
      baseUrl: 'https://api.bamboocardportal.com', authenticationType: 'BasicAuth', settingsJson: null, username: null,
      hasApiKey: true, hasApiSecret: true, hasPassword: false, hasBearerToken: false, hasOAuthSettings: false,
      supportsInventorySync: false, supportsPriceSync: false, supportsReservations: false, supportsOrderStatus: true,
      supportsWebhooks: false, isEnabled: true, createdOnUtc: '2026-01-01T00:00:00Z', modifiedOnUtc: null,
    });
    httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/v1/suppliers/supplier-1/mappings').flush([]);
  });

  it('Create Mapping is disabled until a HAMBOX product AND a supplier product are selected', () => {
    c.openCreateDialog();
    fixture.detectChanges();
    expect(c.canSave()).toBe(false);

    c.onProductSelected(product);
    fixture.detectChanges();
    expect(c.canSave()).toBe(false); // product alone is not enough — no supplier product yet

    c.onCatalogItemSelected(catalogItem);
    fixture.detectChanges();
    expect(c.canSave()).toBe(true); // entire-product scope needs nothing else
  });

  it('selecting "Specific variant" scope requires a variant before Create Mapping is enabled', () => {
    c.openCreateDialog();
    c.onProductSelected(product);
    c.onScopeChange('variant');
    c.onCatalogItemSelected(catalogItem);
    fixture.detectChanges();

    expect(c.canSave()).toBe(false); // scope=variant but no variant picked yet

    c.onVariantSelected(variant);
    fixture.detectChanges();

    expect(c.canSave()).toBe(true);
  });

  it('switching back to "Entire product" clears any previously selected variant', () => {
    c.openCreateDialog();
    c.onProductSelected(product);
    c.onScopeChange('variant');
    c.onVariantSelected(variant);
    expect(c.selectedVariant()).not.toBeNull();

    c.onScopeChange('product');

    expect(c.selectedVariant()).toBeNull();
  });

  it('selecting a supplier catalog item defaults Buying Price from its face value, but stops once the admin types their own', () => {
    c.openCreateDialog();
    c.onCatalogItemSelected(catalogItem);
    expect(c.form.controls.buyingPrice.value).toBe(10);

    c.form.controls.buyingPrice.setValue(7.5);
    c.onBuyingPriceInput(); // marks "touched" the way the real (onInput) template binding does

    c.onCatalogItemSelected({ ...catalogItem, externalProductId: '439686', minFaceValue: 25, maxFaceValue: 25 });

    expect(c.form.controls.buyingPrice.value).toBe(7.5); // the admin's own override is never silently replaced
  });

  it('Create Mapping sends the derived internal/external ids to the existing backend endpoint — never asks the admin to type one', async () => {
    c.openCreateDialog();
    c.onProductSelected(product);
    c.onCatalogItemSelected(catalogItem);
    fixture.detectChanges();

    const savePromise: Promise<void> = c.saveMapping();

    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url === '/api/v1/suppliers/supplier-1/mappings');
    expect(req.request.body).toEqual(
      expect.objectContaining({
        internalProductId: 'product-1',
        internalProductVariantId: null,
        externalProductId: '439685',
        externalName: 'Amazon Gift Card $10',
        currency: 'USD',
        buyingPrice: 10,
        priority: 100,
      }),
    );
    req.flush('mapping-1');
    await flushMicrotasks();

    httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/v1/suppliers/supplier-1/mappings').flush([]);
    await savePromise;

    expect(c.dialogOpen()).toBe(false);
  });

  it('Create Mapping with a variant scope sends the real InternalProductVariantId, not null', async () => {
    c.openCreateDialog();
    c.onProductSelected(product);
    c.onScopeChange('variant');
    c.onVariantSelected(variant);
    c.onCatalogItemSelected(catalogItem);

    const savePromise: Promise<void> = c.saveMapping();

    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url === '/api/v1/suppliers/supplier-1/mappings');
    expect(req.request.body).toEqual(expect.objectContaining({ internalProductVariantId: 'variant-1' }));
    req.flush('mapping-2');
    await flushMicrotasks();
    httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/v1/suppliers/supplier-1/mappings').flush([]);
    await savePromise;
  });

  it('an incomplete mapping never reaches the backend — saveMapping is a no-op when canSave() is false', async () => {
    c.openCreateDialog(); // nothing selected

    await c.saveMapping();

    httpMock.expectNone((r) => r.method === 'POST' && r.url === '/api/v1/suppliers/supplier-1/mappings');
  });

  it('editing an existing mapping still works end-to-end (backend contract for updates is unchanged)', async () => {
    const existingMapping = {
      id: 'mapping-1', supplierId: 'supplier-1', internalProductId: 'product-1', internalProductVariantId: null,
      externalProductId: '439685', externalSku: null, externalName: 'Amazon Gift Card $10', buyingPrice: 10,
      currency: 'USD', priority: 100, status: 'Active', createdOnUtc: '2026-01-01T00:00:00Z',
      internalProductName: 'Amazon Gift Card', internalVariantSku: null,
    };

    void c.openEditDialog(existingMapping);
    fixture.detectChanges();
    // openEditDialog does a best-effort GET for product enrichment — satisfy or ignore it either way.
    const productLookup = httpMock.match((r) => r.method === 'GET' && r.url === '/api/v1/products/product-1');
    productLookup.forEach((r) => r.flush(product));
    await flushMicrotasks();

    expect(c.editingMapping()).toEqual(existingMapping);
    expect(c.form.controls.buyingPrice.value).toBe(10);

    // Re-mapping to a different Bamboo product first (its face value becomes the new default)...
    c.onCatalogItemSelected({ ...catalogItem, name: 'Amazon Gift Card $25', minFaceValue: 25, maxFaceValue: 25, externalProductId: '439686' });
    expect(c.form.controls.buyingPrice.value).toBe(25);
    // ...then the admin explicitly overrides it — exactly like typing into the real (onInput)-bound field.
    c.form.controls.buyingPrice.setValue(12);
    c.onBuyingPriceInput();

    const savePromise: Promise<void> = c.saveMapping();
    const req = httpMock.expectOne((r) => r.method === 'PUT' && r.url === '/api/v1/suppliers/supplier-1/mappings/mapping-1');
    expect(req.request.body).toEqual(
      expect.objectContaining({ externalProductId: '439686', externalName: 'Amazon Gift Card $25', buyingPrice: 12 }),
    );
    req.flush(null);
    await flushMicrotasks();
    httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/v1/suppliers/supplier-1/mappings').flush([existingMapping]);
    await savePromise;

    expect(c.dialogOpen()).toBe(false);
  });
});
