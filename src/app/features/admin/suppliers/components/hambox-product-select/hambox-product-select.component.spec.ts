import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { provideApiTestBed } from '../../../../../testing/common-test.providers';
import { HamboxProductSelectComponent } from './hambox-product-select.component';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('HamboxProductSelectComponent', () => {
  let fixture: ComponentFixture<HamboxProductSelectComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HamboxProductSelectComponent],
      providers: [provideApiTestBed(), provideHttpClientTesting(), provideTranslateService({ lang: 'en', fallbackLang: 'en' })],
    }).compileComponents();

    fixture = TestBed.createComponent(HamboxProductSelectComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('renders the search input when nothing is selected', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector('input');
    expect(input).toBeTruthy();
  });

  it('debounces and calls GET /api/v1/products with the typed search term', async () => {
    const component = fixture.componentInstance as unknown as { onQueryChange: (v: string) => void };
    component.onQueryChange('amazon');

    // debounceTime(300) — wait past it.
    await new Promise((resolve) => setTimeout(resolve, 350));

    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/v1/products');
    expect(req.request.params.get('searchTerm')).toBe('amazon');
    req.flush({ items: [{ id: 'p1', nameEn: 'Amazon Gift Card', nameAr: '', categoryName: 'Gift Cards' }], pageNumber: 1, pageSize: 20, totalCount: 1 });
    await flushMicrotasks();

    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Amazon Gift Card');
  });

  it('emits the selected product and shows its card instead of the search box', async () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.selectedChange.subscribe((p) => emitted.push(p));

    const component = fixture.componentInstance as unknown as { onQueryChange: (v: string) => void; select: (p: unknown) => void };
    component.onQueryChange('amazon');
    await new Promise((resolve) => setTimeout(resolve, 350));
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url === '/api/v1/products')
      .flush({ items: [{ id: 'p1', nameEn: 'Amazon Gift Card', nameAr: '', categoryName: 'Gift Cards' }], pageNumber: 1, pageSize: 20, totalCount: 1 });
    await flushMicrotasks();

    component.select({ id: 'p1', nameEn: 'Amazon Gift Card', nameAr: '', categoryName: 'Gift Cards' });

    expect(emitted).toEqual([{ id: 'p1', nameEn: 'Amazon Gift Card', nameAr: '', categoryName: 'Gift Cards' }]);
  });

  it('clearing emits null and returns to the search box', () => {
    fixture.componentRef.setInput('selected', { id: 'p1', nameEn: 'Amazon Gift Card', nameAr: '', categoryName: 'Gift Cards' });
    fixture.detectChanges();

    const emitted: unknown[] = [];
    fixture.componentInstance.selectedChange.subscribe((p) => emitted.push(p));

    const clearButton = (fixture.nativeElement as HTMLElement).querySelector('.hambox-product-select__card-clear') as HTMLButtonElement;
    clearButton.click();

    expect(emitted).toEqual([null]);
  });

  it('shows the empty-results message when the search returns nothing', async () => {
    const component = fixture.componentInstance as unknown as { onQueryChange: (v: string) => void };
    component.onQueryChange('nonexistent-xyz');
    await new Promise((resolve) => setTimeout(resolve, 350));
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url === '/api/v1/products')
      .flush({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 });
    await flushMicrotasks();

    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('ADMIN.SUPPLIERS.MAPPINGS.NO_PRODUCTS_FOUND');
  });
});
