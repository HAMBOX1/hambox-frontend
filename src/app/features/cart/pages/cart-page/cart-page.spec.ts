import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiTestBed } from '../../../../testing/common-test.providers';
import { CartPageComponent } from './cart-page.component';

describe('CartPageComponent', () => {
  let component: CartPageComponent;
  let fixture: ComponentFixture<CartPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartPageComponent],
      providers: [provideRouter([]), provideApiTestBed()],
    }).compileComponents();

    fixture = TestBed.createComponent(CartPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render cart items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.storefront-cart__title')?.textContent).toContain('Your cart');
    expect(compiled.querySelectorAll('app-cart-line-item').length).toBe(2);
  });
});
