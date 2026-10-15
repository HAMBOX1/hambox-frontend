import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { provideApiTestBed } from '../../../../testing/common-test.providers';
import { Products } from '../../../products/services/products';
import { OrderSuccessDetails } from '../../models/order-success';
import { CheckoutFacade } from '../../services/checkout.facade';
import { OrderSuccessPageComponent } from './order-success-page.component';

const DETAILS: OrderSuccessDetails = {
  orderId: 'HB-20481',
  total: 25,
  items: [
    { id: 'i1', title: 'PlayStation Gift Card $25', subtitle: 'Digital code', imageUrl: '', price: 25 },
  ],
};

/**
 * Audit R46 — behavioural spec for the order-confirmation page: it confirms the order and where to find the
 * purchase, it is built from the order alone (never a code), and a failed load offers a retry.
 */
describe('OrderSuccessPageComponent (confirmation behaviour)', () => {
  let loadOrder: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<OrderSuccessPageComponent>;

  async function create(orderId: string | null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [OrderSuccessPageComponent],
      providers: [
        provideRouter([]),
        provideApiTestBed(),
        { provide: CheckoutFacade, useValue: { loadOrder } },
        { provide: Products, useValue: { getActiveProducts: vi.fn().mockResolvedValue({ items: [] }) } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => orderId } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderSuccessPageComponent);
    fixture.detectChanges();
    for (let i = 0; i < 5; i++) {
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
    }
  }

  beforeEach(() => {
    loadOrder = vi.fn();
  });

  it('confirms the order number, what was bought, and links to the library', async () => {
    loadOrder.mockResolvedValue(DETAILS);

    await create('order-1');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(loadOrder).toHaveBeenCalledWith('order-1');
    expect(text).toContain('HB-20481');
    expect(text).toContain('PlayStation Gift Card $25');
    expect(fixture.nativeElement.querySelector('a[href="/account/library"]')).toBeTruthy();
  });

  it('never shows a code on the confirmation page', async () => {
    loadOrder.mockResolvedValue(DETAILS);

    await create('order-1');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toMatch(/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  });

  it('offers a retry instead of a broken page when the order cannot be loaded', async () => {
    loadOrder.mockRejectedValue(new Error('boom'));

    await create('order-1');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Order unavailable');
    expect(text).toContain('Try again');
  });
});
