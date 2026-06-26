import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { finalize } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { Auth } from '../../services/auth';
import {
  applyServerValidationErrors,
  getControlErrorMessage,
  passwordsMatchValidator,
} from '../../utils/auth-form.utils';

const FIELD_LABELS = {
  fullName: 'Username',
  email: 'Email',
  phone: 'Phone number',
  password: 'Password',
  confirmPassword: 'Confirm password',
  referralCode: 'Referral code',
  acceptTerms: 'Terms acceptance',
};

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, CheckboxModule],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  private readonly auth = inject(Auth);
  private readonly fb = inject(FormBuilder);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly activeFeatureIndex = signal(2);
  protected readonly logoSrc = 'assets/images/top-nav/hambox-title.png';

  protected readonly features = [
    {
      icon: 'pi-box',
      title: 'Track Orders',
      description: 'Real-time telemetry and global positioning updates.',
    },
    {
      icon: 'pi-key',
      title: 'Access Codes',
      description: 'Unique identification for restricted terminal access.',
    },
    {
      icon: 'pi-sparkles',
      title: 'AI Support',
      description: 'Autonomous protocol assistance active 24/7/365.',
    },
  ] as const;

  protected readonly steps = [
    { id: 1, label: 'Identity' },
    { id: 2, label: 'Verify' },
    { id: 3, label: 'Confirm' },
  ] as const;

  protected readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(200)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
      referralCode: [''],
      acceptTerms: [false, Validators.requiredTrue],
    },
    { validators: passwordsMatchValidator },
  );

  protected fieldError(controlName: string): string | null {
    return getControlErrorMessage(controlName, this.form, FIELD_LABELS);
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  protected submit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    const { fullName, email, password } = this.form.getRawValue();
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    this.isSubmitting.set(true);

    this.auth
      .register({ firstName, lastName, email, password })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            'Commander profile initialized. Check your inbox for a verification link before signing in.',
          );
          this.form.reset({ acceptTerms: false });
        },
        error: (error: unknown) => {
          if (error instanceof ApiError) {
            applyServerValidationErrors(this.form, error);
            this.errorMessage.set(error.message);
            return;
          }

          this.errorMessage.set('Unable to initialize your profile. Please try again.');
        },
      });
  }
}
