import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { provideApiTestBed } from '../../../../testing/common-test.providers';
import { CartPageComponent } from './cart-page.component';

describe('CartPageComponent', () => {
  let component: CartPageComponent;
  let fixture: ComponentFixture<CartPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartPageComponent],
      providers: [provideRouter([]), provideApiTestBed(), MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(CartPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the cart shell without any line items before the cart has loaded', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    // The page used to assert hard-coded mock lines; the cart now comes from the API, so with nothing
    // loaded there must be no line items (the data-driven cases are covered by the backend cart tests).
    expect(compiled.querySelectorAll('app-cart-line-item').length).toBe(0);
  });
});
