import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';
import { RegisterPageComponent } from './register-page.component';

/** jsdom has no ResizeObserver, which PrimeNG's tab list needs on init. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('RegisterPageComponent', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  let component: RegisterPageComponent;
  let fixture: ComponentFixture<RegisterPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
        { provide: API_BASE_URL, useValue: '' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('legal acceptance and the security token', () => {
    /** The page's protected members, reachable for behaviour checks. */
    type Internals = {
      form: RegisterPageComponent['form'];
      turnstileToken: { set(value: string | null): void };
      legalDialogVisible: () => boolean;
      errorMessage: () => string | null;
      submit(): void;
      onLegalAccepted(): void;
    };

    let page: Internals;

    beforeEach(() => {
      page = component as unknown as Internals;
      page.form.setValue({
        fullName: 'Test User',
        email: 'test@example.test',
        phone: '+201000000000',
        password: 'Str0ng!Passw0rd',
        confirmPassword: 'Str0ng!Passw0rd',
        referralCode: '',
      });
    });

    it('opens the legal dialog on the first submit instead of registering', () => {
      page.turnstileToken.set('token');
      page.submit();

      expect(page.legalDialogVisible()).toBe(true);
      TestBed.inject(HttpTestingController).expectNone((request) => request.url.includes('register'));
    });

    it('reports an expired security check instead of silently doing nothing', () => {
      page.turnstileToken.set('token');
      page.submit();
      page.turnstileToken.set(null);

      page.onLegalAccepted();

      expect(page.legalDialogVisible()).toBe(false);
      expect(page.errorMessage()).toBeTruthy();
      TestBed.inject(HttpTestingController).expectNone((request) => request.url.includes('register'));
    });

    it('skips the legal dialog on a later submit once it was accepted', () => {
      page.turnstileToken.set('token');
      page.submit();
      page.turnstileToken.set(null);
      page.onLegalAccepted();

      page.turnstileToken.set('fresh-token');
      page.submit();

      expect(page.legalDialogVisible()).toBe(false);
      TestBed.inject(HttpTestingController).expectOne((request) => request.url.includes('register'));
    });
  });
});
