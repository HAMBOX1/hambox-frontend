import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiTestBed } from '../../../../testing/common-test.providers';
import { PaymentProcessingPageComponent } from './payment-processing-page.component';

describe('PaymentProcessingPageComponent', () => {
  let component: PaymentProcessingPageComponent;
  let fixture: ComponentFixture<PaymentProcessingPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentProcessingPageComponent],
      providers: [provideRouter([]), provideApiTestBed()],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentProcessingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render processing card', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-payment-processing-card')).toBeTruthy();
    expect(compiled.textContent).toContain('Processing Transaction');
  });
});
