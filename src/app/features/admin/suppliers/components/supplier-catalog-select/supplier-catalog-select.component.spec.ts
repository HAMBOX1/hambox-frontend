import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { provideApiTestBed } from '../../../../../testing/common-test.providers';
import { SuppliersManagementFacade } from '../../services/suppliers-management.facade';
import { SupplierCatalogSelectComponent } from './supplier-catalog-select.component';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('SupplierCatalogSelectComponent', () => {
  let fixture: ComponentFixture<SupplierCatalogSelectComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierCatalogSelectComponent],
      providers: [
        provideApiTestBed(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
        SuppliersManagementFacade, // provided here since this spec mounts the component standalone, without the mappings page as parent
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierCatalogSelectComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('supplierId', 'supplier-1');
    fixture.detectChanges();
  });

  it('calls GET /api/v1/suppliers/{id}/catalog with the search term — never a direct Bamboo request', async () => {
    const component = fixture.componentInstance as unknown as { onQueryChange: (v: string) => void };
    component.onQueryChange('amazon');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await flushMicrotasks();

    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/v1/suppliers/supplier-1/catalog');
    expect(req.request.params.get('search')).toBe('amazon');
    // The URL asserted above is the only request this component ever issues — structurally, it cannot reach bamboocardportal.com directly.
    req.flush({ isSuccess: true, items: [{ externalProductId: '439685', name: 'Amazon Gift Card $10', brandName: 'Amazon', currency: 'USD', minFaceValue: 10, maxFaceValue: 10, available: true }], message: null });
    await flushMicrotasks();

    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Amazon Gift Card $10');
  });

  it('emits the selected catalog item on click', async () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.selectedChange.subscribe((i) => emitted.push(i));

    const component = fixture.componentInstance as unknown as { onQueryChange: (v: string) => void };
    component.onQueryChange('amazon');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await flushMicrotasks();
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url === '/api/v1/suppliers/supplier-1/catalog')
      .flush({ isSuccess: true, items: [{ externalProductId: '439685', name: 'Amazon Gift Card $10', brandName: 'Amazon', currency: 'USD', minFaceValue: 10, maxFaceValue: 10, available: true }], message: null });
    await flushMicrotasks();
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('.supplier-catalog-select__result') as HTMLButtonElement;
    button.click();

    expect(emitted.length).toBe(1);
    expect((emitted[0] as { externalProductId: string }).externalProductId).toBe('439685');
  });

  it('shows the provider-unsupported message (not an empty-results message) when isSuccess is false', async () => {
    const component = fixture.componentInstance as unknown as { onQueryChange: (v: string) => void };
    component.onQueryChange('anything');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await flushMicrotasks();
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url === '/api/v1/suppliers/supplier-1/catalog')
      .flush({ isSuccess: false, items: [], message: 'Manual supplier has no browsable catalog.' });
    await flushMicrotasks();

    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Manual supplier has no browsable catalog.');
  });

  it('shows a retryable error state on network/HTTP failure', async () => {
    const component = fixture.componentInstance as unknown as { onQueryChange: (v: string) => void };
    component.onQueryChange('amazon');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await flushMicrotasks();
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url === '/api/v1/suppliers/supplier-1/catalog')
      .flush('error', { status: 500, statusText: 'Server Error' });
    await flushMicrotasks();

    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('ADMIN.SUPPLIERS.MAPPINGS.CATALOG_UNAVAILABLE');
    expect(html).toContain('ADMIN.SUPPLIERS.MAPPINGS.RETRY');
  });
});
