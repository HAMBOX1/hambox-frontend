import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiTestBed } from '../../../../testing/common-test.providers';
import { OrderSuccessPageComponent } from './order-success-page.component';

describe('OrderSuccessPageComponent', () => {
  let component: OrderSuccessPageComponent;
  let fixture: ComponentFixture<OrderSuccessPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderSuccessPageComponent],
      providers: [provideRouter([]), provideApiTestBed()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderSuccessPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render order success hero', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-order-success-hero')).toBeTruthy();
    expect(compiled.textContent).toContain('Order Successful');
    expect(compiled.textContent).toContain('HB-99201-X42');
  });

  it('should render purchased items and recommendations', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-order-purchased-items')).toBeTruthy();
    expect(compiled.querySelector('app-order-recommendations')).toBeTruthy();
    expect(compiled.textContent).toContain('Cyber Protocol');
    expect(compiled.textContent).toContain("Gamer's Also Bought");
  });
});
