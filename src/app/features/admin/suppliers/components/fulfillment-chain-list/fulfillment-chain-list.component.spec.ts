import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { SupplierFulfillmentChainCandidateDto } from '../../models/supplier.model';
import { FulfillmentChainListComponent } from './fulfillment-chain-list.component';

function candidate(overrides: Partial<SupplierFulfillmentChainCandidateDto> = {}): SupplierFulfillmentChainCandidateDto {
  return {
    mappingId: 'mapping-1',
    supplierId: 'supplier-1',
    supplierName: 'Bamboo Cards',
    providerType: 'Bamboo',
    scope: 'VariantSpecific',
    externalProductId: 'EXT-1',
    priority: 0,
    mappingStatus: 'Active',
    supplierEnabled: true,
    credentialsConfigured: true,
    providerRegistered: true,
    isReady: true,
    ...overrides,
  };
}

describe('FulfillmentChainListComponent', () => {
  let fixture: ComponentFixture<FulfillmentChainListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FulfillmentChainListComponent],
      providers: [provideTranslateService({ lang: 'en', fallbackLang: 'en' })],
    }).compileComponents();

    fixture = TestBed.createComponent(FulfillmentChainListComponent);
    fixture.componentRef.setInput('candidates', []);
  });

  it('shows the empty state when there are no candidates', () => {
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('ADMIN.FULFILLMENT.CHAIN.EMPTY_TITLE');
  });

  it('renders every candidate in the given (priority) order', () => {
    fixture.componentRef.setInput('candidates', [
      candidate({ mappingId: 'a', supplierName: 'Bamboo Cards', priority: 0, scope: 'VariantSpecific' }),
      candidate({ mappingId: 'b', supplierName: 'Second Supplier', priority: 1, scope: 'ProductWide' }),
    ]);
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.fulfillment-chain__row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Bamboo Cards');
    expect(rows[1].textContent).toContain('Second Supplier');
  });

  it('visually distinguishes a variant-specific mapping from a product-wide one', () => {
    fixture.componentRef.setInput('candidates', [
      candidate({ mappingId: 'a', scope: 'VariantSpecific' }),
      candidate({ mappingId: 'b', scope: 'ProductWide' }),
    ]);
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.fulfillment-chain__row');
    expect(rows[0].textContent).toContain('ADMIN.FULFILLMENT.CHAIN.SCOPE_VARIANT');
    expect(rows[1].textContent).toContain('ADMIN.FULFILLMENT.CHAIN.SCOPE_PRODUCT');
  });

  it('marks a disabled supplier as not ready and explains why', () => {
    fixture.componentRef.setInput('candidates', [
      candidate({ mappingId: 'a', supplierEnabled: false, isReady: false }),
    ]);
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.fulfillment-chain__row') as HTMLElement;
    expect(row.classList.contains('fulfillment-chain__row--not-ready')).toBe(true);
    expect(row.textContent).toContain('ADMIN.FULFILLMENT.CHAIN.NOT_READY_DISABLED');
  });

  it('never renders any credential-shaped value', () => {
    fixture.componentRef.setInput('candidates', [candidate()]);
    fixture.detectChanges();

    const html = (fixture.nativeElement as HTMLElement).innerHTML.toLowerCase();
    expect(html).not.toContain('apikey');
    expect(html).not.toContain('apisecret');
    expect(html).not.toContain('bearertoken');
    expect(html).not.toContain('password');
  });

  it('emits a reordered array when a drop reorders items', () => {
    const candidates = [candidate({ mappingId: 'a' }), candidate({ mappingId: 'b' })];
    fixture.componentRef.setInput('candidates', candidates);
    fixture.componentRef.setInput('reorderable', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const emitted: SupplierFulfillmentChainCandidateDto[][] = [];
    component.reordered.subscribe((value) => emitted.push([...value]));

    (component as unknown as { onDrop: (event: { previousIndex: number; currentIndex: number }) => void }).onDrop({
      previousIndex: 0,
      currentIndex: 1,
    });

    expect(emitted.length).toBe(1);
    expect(emitted[0].map((c) => c.mappingId)).toEqual(['b', 'a']);
  });
});
