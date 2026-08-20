import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';

import { PermissionService } from '../../../../core/permissions/permission.service';
import { SupplierFulfillmentChainCandidateDto } from '../../../admin/suppliers/models/supplier.model';
import { SuppliersManagementFacade } from '../../../admin/suppliers/services/suppliers-management.facade';
import { FulfillmentMode, ProductVariantDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import { VariantFulfillmentPanelComponent } from './variant-fulfillment-panel.component';

function variant(overrides: Partial<ProductVariantDto> = {}): ProductVariantDto {
  return {
    id: 'variant-1',
    productId: 'product-1',
    planId: null,
    sku: 'SKU-1',
    priceOverride: null,
    comparePrice: null,
    sortOrder: 0,
    status: 'Active',
    isVisible: true,
    membershipPlanId: null,
    lowStockThreshold: 5,
    availableStock: 0,
    reservedStock: 0,
    soldStock: 0,
    totalCodesCount: 0,
    isLowStock: false,
    isOutOfStock: true,
    optionIds: [],
    fulfillmentMode: 'ManualOnly',
    ...overrides,
  };
}

class FakeProductEditorFacade {
  readonly selectedVariant: WritableSignal<ProductVariantDto | null> = signal(variant());
  readonly productId: WritableSignal<string | null> = signal('product-1');
  readonly setVariantFulfillmentMode = vi.fn().mockImplementation(async (_variantId: string, mode: FulfillmentMode) => {
    const current = this.selectedVariant();
    if (current) {
      this.selectedVariant.set({ ...current, fulfillmentMode: mode });
    }
    return true;
  });
}

class FakeSuppliersManagementFacade {
  readonly fulfillmentChain: WritableSignal<readonly SupplierFulfillmentChainCandidateDto[]> = signal([]);
  readonly fulfillmentChainLoading = signal(false);
  readonly fulfillmentChainError: WritableSignal<string | null> = signal(null);
  readonly loadFulfillmentChain = vi.fn().mockResolvedValue(undefined);
  readonly clearFulfillmentChain = vi.fn();
  readonly reorderFulfillmentChainPriorities = vi.fn().mockResolvedValue(true);
}

describe('VariantFulfillmentPanelComponent', () => {
  let fixture: ComponentFixture<VariantFulfillmentPanelComponent>;
  let facade: FakeProductEditorFacade;
  let suppliersFacade: FakeSuppliersManagementFacade;

  async function setup(options: { canEdit?: boolean; initialMode?: FulfillmentMode; chainError?: string | null } = {}): Promise<void> {
    const { canEdit = true, initialMode = 'ManualOnly', chainError = null } = options;

    facade = new FakeProductEditorFacade();
    facade.selectedVariant.set(variant({ fulfillmentMode: initialMode }));
    suppliersFacade = new FakeSuppliersManagementFacade();
    suppliersFacade.fulfillmentChainError.set(chainError);

    await TestBed.configureTestingModule({
      imports: [VariantFulfillmentPanelComponent],
      providers: [
        provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
        { provide: ProductEditorFacade, useValue: facade },
        { provide: PermissionService, useValue: { isOwner: () => canEdit, hasAnyPermission: () => canEdit } },
      ],
    })
      .overrideComponent(VariantFulfillmentPanelComponent, {
        set: { providers: [{ provide: SuppliersManagementFacade, useValue: suppliersFacade }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(VariantFulfillmentPanelComponent);
    fixture.detectChanges();
  }

  it('renders all four fulfillment modes', async () => {
    await setup();
    const cards = fixture.nativeElement.querySelectorAll('.variant-fulfillment__mode-card');
    expect(cards.length).toBe(4);
  });

  it('highlights the currently selected mode', async () => {
    await setup({ initialMode: 'SupplierFirst' });

    const selected = fixture.nativeElement.querySelectorAll('.variant-fulfillment__mode-card.is-selected');
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toContain('ADMIN.FULFILLMENT.MODE.SUPPLIER_FIRST');
  });

  it('shows the readiness badge derived from stock and the supplier chain', async () => {
    await setup();
    const badge = fixture.nativeElement.querySelector('.variant-fulfillment__summary app-admin-status-badge');
    expect(badge).toBeTruthy();
  });

  it('invokes ProductEditorFacade.setVariantFulfillmentMode when a harmless mode change is selected', async () => {
    await setup({ initialMode: 'ManualFirst' });

    // ManualFirst -> SupplierFirst is not a "loses a whole source" transition, so it applies immediately.
    const supplierFirstCard = Array.from(fixture.nativeElement.querySelectorAll('.variant-fulfillment__mode-card')).find((el) =>
      (el as HTMLElement).textContent?.includes('ADMIN.FULFILLMENT.MODE.SUPPLIER_FIRST'),
    ) as HTMLButtonElement;
    supplierFirstCard.click();
    await fixture.whenStable();

    expect(facade.setVariantFulfillmentMode).toHaveBeenCalledWith('variant-1', 'SupplierFirst');
  });

  it('requires confirmation before switching to SupplierOnly (drops the manual safety net)', async () => {
    await setup({ initialMode: 'ManualOnly' });

    const supplierOnlyCard = Array.from(fixture.nativeElement.querySelectorAll('.variant-fulfillment__mode-card')).find((el) =>
      (el as HTMLElement).textContent?.includes('ADMIN.FULFILLMENT.MODE.SUPPLIER_ONLY'),
    ) as HTMLButtonElement;
    supplierOnlyCard.click();
    await fixture.whenStable();

    // Not applied yet — waiting on confirmation.
    expect(facade.setVariantFulfillmentMode).not.toHaveBeenCalled();
    const dialog = fixture.nativeElement.querySelector('app-admin-confirm-dialog');
    expect(dialog).toBeTruthy();
  });

  it('hides mutation controls for a read-only (no Catalog.Inventory.Edit) user', async () => {
    await setup({ canEdit: false });

    const buttons = fixture.nativeElement.querySelectorAll('button.variant-fulfillment__mode-card');
    const readOnlyCards = fixture.nativeElement.querySelectorAll('.variant-fulfillment__mode-card--readonly');
    expect(buttons.length).toBe(0);
    expect(readOnlyCards.length).toBe(4);
  });

  it('surfaces a chain load error via the safe error-alert component, never a raw exception', async () => {
    await setup({ initialMode: 'SupplierOnly', chainError: 'Failed to load the fulfillment chain.' });

    const alert = fixture.nativeElement.querySelector('app-admin-error-alert');
    expect(alert).toBeTruthy();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).not.toContain('Stack');
    expect(html).not.toContain('at Object.');
  });

  it('never renders any credential-shaped value anywhere in the panel', async () => {
    await setup({ initialMode: 'SupplierOnly' });

    const html = (fixture.nativeElement as HTMLElement).innerHTML.toLowerCase();
    expect(html).not.toContain('apikey');
    expect(html).not.toContain('apisecret');
    expect(html).not.toContain('bearertoken');
  });
});
