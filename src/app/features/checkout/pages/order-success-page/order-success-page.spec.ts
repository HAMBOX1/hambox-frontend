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

  it('renders without a loaded order and shows no purchased items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    // Previously asserted hard-coded mock order data; the page is now data-driven from the API.
    expect(compiled.textContent).not.toContain('HB-99201-X42');
  });
});
