import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { finalize, firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../../core/api/api-client.service';
import { LEGAL_API } from '../../../../core/api/api-endpoints';
import { ApiError } from '../../../../core/models/api-error.model';
import { GoogleIdentityService } from '../../../../core/auth/google-identity.service';
import { LegalAcceptanceDialogComponent } from '../../../../shared/components/legal-acceptance-dialog/legal-acceptance-dialog.component';
import { Auth } from '../../services/auth';
import { CartFacade } from '../../../cart/services/cart.facade';
import { CustomerAlertsFacade } from '../../../account/services/customer-alerts.facade';
import {
  applyServerValidationErrors,
  getControlErrorMessage,
} from '../../utils/auth-form.utils';

interface LegalAcceptanceStatusDto {
  requiresAcceptance: boolean;
  staleSlugs: readonly string[];
}

const FIELD_LABELS = {
  email: 'Email or phone',
  password: 'Password',
};

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, CheckboxModule, LegalAcceptanceDialogComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly auth = inject(Auth);
  private readonly googleIdentity = inject(GoogleIdentityService);
  private readonly cartFacade = inject(CartFacade);
  private readonly alertsFacade = inject(CustomerAlertsFacade);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiClientService);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly legalUpdateDialogVisible = signal(false);
  protected readonly staleLegalSlugs = signal<readonly string[]>([]);
  protected readonly logoSrc = 'assets/images/top-nav/hambox-title.png';
  protected readonly heroBackground = 'assets/images/hambox-hero-background.png';

  protected readonly features = [
    {
      icon: 'pi-bolt',
      title: 'Instant Delivery',
      description: 'Automated key fulfillment systems operating at sub-second latency.',
    },
    {
      icon: 'pi-shield',
      title: 'Secure Assets',
      description: 'Every purchase protected by military-grade AES-256 encryption protocols.',
    },
  ] as const;

  protected readonly satisfactionAvatars = ['A', 'M', 'K'] as const;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false],
  });

  protected fieldError(controlName: string): string | null {
    return getControlErrorMessage(controlName, this.form, FIELD_LABELS);
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected submit(): void {
    this.errorMessage.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    const { email, password, rememberMe } = this.form.getRawValue();

    this.auth
      .login({ email, password, rememberMe })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => this.onLoginSuccess(),
        error: (error: unknown) => this.onLoginError(error),
      });
  }

  protected async continueWithGoogle(): Promise<void> {
    this.errorMessage.set(null);

    try {
      await this.googleIdentity.signIn((idToken) => {
        this.isSubmitting.set(true);
        this.auth
          .loginWithGoogle(idToken)
          .pipe(finalize(() => this.isSubmitting.set(false)))
          .subscribe({
            next: () => this.onLoginSuccess(),
            error: (error: unknown) => this.onLoginError(error),
          });
      });
    } catch {
      this.errorMessage.set('Google sign-in is unavailable right now.');
    }
  }

  private onLoginSuccess(): void {
    void this.checkLegalAcceptance().then((requiresAcceptance) => {
      if (!requiresAcceptance) {
        void this.completeLogin();
      }
    });
  }

  private async checkLegalAcceptance(): Promise<boolean> {
    try {
      const status = await firstValueFrom(
        this.api.get<LegalAcceptanceStatusDto>(LEGAL_API.acceptanceStatus),
      );

      if (status.requiresAcceptance) {
        this.staleLegalSlugs.set(status.staleSlugs);
        this.legalUpdateDialogVisible.set(true);
        return true;
      }

      return false;
    } catch {
      // If the status check itself fails, don't block login on it.
      return false;
    }
  }

  protected async onLegalUpdateAccepted(): Promise<void> {
    try {
      await firstValueFrom(this.api.post<void>(LEGAL_API.acceptance, {}));
    } finally {
      this.legalUpdateDialogVisible.set(false);
      void this.completeLogin();
    }
  }

  private completeLogin(): Promise<void> {
    return Promise.all([
      this.cartFacade.mergeGuestCartIfNeeded(),
      this.alertsFacade.claimGuestAlertsIfNeeded(),
    ]).then(() => {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
      void this.router.navigateByUrl(returnUrl);
    });
  }

  private onLoginError(error: unknown): void {
    if (error instanceof ApiError) {
      applyServerValidationErrors(this.form, error);
      this.errorMessage.set(error.message);
      return;
    }

    this.errorMessage.set('Unable to sign in. Please try again.');
  }
}
