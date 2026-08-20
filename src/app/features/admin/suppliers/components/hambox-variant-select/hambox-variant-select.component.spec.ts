import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { provideApiTestBed } from '../../../../../testing/common-test.providers';
import { HamboxVariantSelectComponent } from './hambox-variant-select.component';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('HamboxVariantSelectComponent', () => {
  let fixture: ComponentFixture<HamboxVariantSelectComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HamboxVariantSelectComponent],
      providers: [provideApiTestBed(), provideHttpClientTesting(), provideTranslateService({ lang: 'en', fallbackLang: 'en' })],
    }).compileComponents();

    fixture = TestBed.createComponent(HamboxVariantSelectComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('loads variants for the given productId as soon as it is set', async () => {
    fixture.componentRef.setInput('productId', 'p1');
    fixture.detectChanges();
    await flushMicrotasks();

    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/v1/inventory/products/p1/variants');
    req.flush([{ id: 'v1', productId: 'p1', sku: 'AMAZON-US-10', priceOverride: 10, availableStock: 5, isOutOfStock: false }]);
    await flushMicrotasks();

    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('AMAZON-US-10');
  });

  it('emits the selected variant on click', async () => {
    fixture.componentRef.setInput('productId', 'p1');
    fixture.detectChanges();
    await flushMicrotasks();
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url === '/api/v1/inventory/products/p1/variants')
      .flush([{ id: 'v1', productId: 'p1', sku: 'AMAZON-US-10', priceOverride: 10 }]);
    await flushMicrotasks();
    fixture.detectChanges();

    const emitted: unknown[] = [];
    fixture.componentInstance.selectedChange.subscribe((v) => emitted.push(v));

    const button = (fixture.nativeElement as HTMLElement).querySelector('.hambox-variant-select__result') as HTMLButtonElement;
    button.click();

    expect(emitted.length).toBe(1);
    expect((emitted[0] as { sku: string }).sku).toBe('AMAZON-US-10');
  });

  it('shows the no-variants message for a product with an empty variant list', async () => {
    fixture.componentRef.setInput('productId', 'p2');
    fixture.detectChanges();
    await flushMicrotasks();
    httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/v1/inventory/products/p2/variants').flush([]);
    await flushMicrotasks();

    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('ADMIN.SUPPLIERS.MAPPINGS.NO_VARIANTS');
  });

  it('reloads when productId changes to a different product', async () => {
    fixture.componentRef.setInput('productId', 'p1');
    fixture.detectChanges();
    await flushMicrotasks();
    httpMock.expectOne((r) => r.url === '/api/v1/inventory/products/p1/variants').flush([{ id: 'v1', productId: 'p1', sku: 'A' }]);
    await flushMicrotasks();

    fixture.componentRef.setInput('productId', 'p2');
    fixture.detectChanges();
    await flushMicrotasks();

    httpMock.expectOne((r) => r.url === '/api/v1/inventory/products/p2/variants').flush([{ id: 'v2', productId: 'p2', sku: 'B' }]);
    await flushMicrotasks();
    fixture.detectChanges();

    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('B');
    expect(html).not.toContain('A');
  });
});
