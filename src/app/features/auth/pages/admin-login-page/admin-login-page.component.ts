import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import {
  UiAuthCardComponent,
  UiButtonComponent,
  UiFieldComponent,
  UiInputComponent,
  UiPasswordInputComponent,
} from '../../../../shared/components/ui';
import { finalize } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { ThemeService } from '../../../../core/theme/theme.service';
import { AdminAuth } from '../../services/admin-auth';
import { saveAdminOtpChallenge } from '../../services/admin-otp-state';
import {
  applyServerValidationErrors,
  getControlErrorMessage,
} from '../../utils/auth-form.utils';

@Component({
  selector: 'app-admin-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    UiAuthCardComponent,
    UiFieldComponent,
    UiInputComponent,
    UiPasswordInputComponent,
    UiButtonComponent,
  ],
  templateUrl: './admin-login-page.component.html',
  styleUrl: './admin-login-page.component.scss',
  host: { class: 'ui-auth' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginPageComponent {
  private readonly adminAuth = inject(AdminAuth);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly theme = inject(ThemeService);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false],
  });

  protected fieldError(controlName: string): string | null {
    return getControlErrorMessage(controlName, this.form, {
      email: 'Email',
      password: 'Password',
    });
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }

  protected submit(): void {
    this.errorMessage.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    const { email, password } = this.form.getRawValue();
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/admin/products';

    this.adminAuth
      .login({ email, password })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: async (challenge) => {
          if (challenge.token) {
            await this.adminAuth.completeLoginWithToken(challenge.token);
            window.alert(
              'You were signed in without OTP verification because Admin OTP is currently ' +
                'disabled in Settings → Authentication (typically because SMTP email ' +
                'delivery is not configured yet). Re-enable Admin OTP as soon as email is working.',
            );
            await this.router.navigateByUrl(returnUrl);
            return;
          }

          saveAdminOtpChallenge({
            challengeId: challenge.challengeId,
            maskedEmail: challenge.maskedEmail,
            expiresAt: challenge.expiresAt,
            resendAvailableAt: challenge.resendAvailableAt,
            returnUrl,
          });
          void this.router.navigate(['/admin/login/verify-otp']);
        },
        error: (error: unknown) => {
          if (error instanceof ApiError) {
            applyServerValidationErrors(this.form, error);
            this.errorMessage.set(error.message);
            return;
          }
          this.errorMessage.set('Unable to sign in. Please try again.');
        },
      });
  }
}
