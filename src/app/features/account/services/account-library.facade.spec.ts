import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { CustomerLibraryItemApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';
import { AccountLibraryFacade } from './account-library.facade';

function item(overrides: Partial<CustomerLibraryItemApiDto> = {}): CustomerLibraryItemApiDto {
  return {
    id: 'item-1',
    orderId: 'order-1',
    orderItemId: 'order-item-1',
    productId: 'product-1',
    productVariantId: null,
    productNameEn: 'Gift card $25',
    productImageUrl: null,
    platform: null,
    edition: null,
    region: null,
    purchaseDate: '2026-10-01T10:00:00Z',
    orderNumber: 'HB-1001',
    orderStatus: 'Completed',
    deliveryStatus: 'Delivered',
    maskedLicenseKey: 'XXXX-••••-••••-1234',
    canReveal: true,
    redeemInstructions: null,
    invoiceUrl: null,
    supportUrl: null,
    isRecentPurchase: true,
    hasInstructions: false,
    ...overrides,
  };
}

/**
 * Audit R46 — behavioural spec for the "My codes" page (the library). The page is the only place a code is
 * ever shown: it arrives masked, is revealed on request (behind an e-mailed code when the store requires
 * one), and never appears in the list payload itself.
 */
describe('AccountLibraryFacade (My Codes behaviour)', () => {
  let facade: AccountLibraryFacade;
  let api: {
    getLibrary: ReturnType<typeof vi.fn>;
    revealLibraryKey: ReturnType<typeof vi.fn>;
    revealLibraryKeyWithOtp: ReturnType<typeof vi.fn>;
    requestRevealOtp: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      getLibrary: vi.fn(),
      revealLibraryKey: vi.fn(),
      revealLibraryKeyWithOtp: vi.fn(),
      requestRevealOtp: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [AccountLibraryFacade, { provide: AccountApiService, useValue: api }],
    });

    facade = TestBed.inject(AccountLibraryFacade);
  });

  it('lists purchases with the code masked and nothing revealed', async () => {
    api.getLibrary.mockReturnValue(of({ items: [item()], totalCount: 1, pageNumber: 1, pageSize: 12 }));

    await facade.load();

    expect(facade.items()).toHaveLength(1);
    expect(facade.items()[0].maskedLicenseKey).toContain('•');
    expect(facade.isKeyRevealed('item-1')).toBe(false);
    expect(facade.getRevealedKey('item-1')).toBeNull();
  });

  it('shows the empty state — not an error — when nothing has been purchased yet', async () => {
    api.getLibrary.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 12 }));

    await facade.load();

    expect(facade.isEmpty()).toBe(true);
    expect(facade.error()).toBeNull();
  });

  it('keeps a pending delivery visible without a code to reveal', async () => {
    api.getLibrary.mockReturnValue(
      of({
        items: [item({ deliveryStatus: 'Pending', canReveal: false, maskedLicenseKey: '' })],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 12,
      }),
    );

    await facade.load();

    expect(facade.items()[0].canReveal).toBe(false);
    expect(facade.items()[0].deliveryStatus).toBe('Pending');
  });

  it('reports a load failure as an error with no stale items', async () => {
    api.getLibrary.mockReturnValue(throwError(() => new Error('network down')));

    await facade.load();

    expect(facade.items()).toHaveLength(0);
    expect(facade.error()).toBeTruthy();
  });

  it('reveals a code on request and hides it again on demand', async () => {
    api.getLibrary.mockReturnValue(of({ items: [item()], totalCount: 1, pageNumber: 1, pageSize: 12 }));
    api.revealLibraryKey.mockReturnValue(of({ licenseKey: 'ABCD-EFGH-1234' }));
    await facade.load();

    const outcome = await facade.revealKey('item-1');

    expect(outcome.key).toBe('ABCD-EFGH-1234');
    expect(facade.isKeyRevealed('item-1')).toBe(true);

    facade.hideKey('item-1');
    expect(facade.isKeyRevealed('item-1')).toBe(false);
    expect(facade.getRevealedKey('item-1')).toBeNull();
  });

  it('asks for the e-mailed code first when the store requires one, and shows nothing meanwhile', async () => {
    api.revealLibraryKey.mockReturnValue(
      throwError(() => new ApiError('A code is required', { status: 403, code: 'Commerce.RevealOtpRequired' })),
    );

    const outcome = await facade.revealKey('item-1');

    expect(outcome.needsOtp).toBe(true);
    expect(outcome.key).toBeNull();
    expect(facade.isKeyRevealed('item-1')).toBe(false);
    expect(facade.error()).toBeNull();
  });

  it('reveals with the e-mailed code, and keeps the code hidden when it is wrong', async () => {
    api.revealLibraryKeyWithOtp.mockReturnValueOnce(
      throwError(() => new ApiError('That code is not correct.', { status: 400, code: 'Commerce.RevealOtpInvalid' })),
    );
    api.revealLibraryKeyWithOtp.mockReturnValueOnce(of({ licenseKey: 'ABCD-EFGH-1234' }));

    const wrong = await facade.revealKey('item-1', '000000');
    expect(wrong.key).toBeNull();
    expect(wrong.error).toBeTruthy();
    expect(facade.isKeyRevealed('item-1')).toBe(false);

    const right = await facade.revealKey('item-1', '123456');
    expect(right.key).toBe('ABCD-EFGH-1234');
    expect(facade.isKeyRevealed('item-1')).toBe(true);
  });

  it('cannot copy a code that has not been revealed', async () => {
    expect(await facade.copyKey('item-1')).toBe(false);
  });
});
