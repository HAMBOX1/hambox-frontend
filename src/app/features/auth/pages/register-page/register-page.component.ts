import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { LegalAcceptanceDialogComponent } from '../../../../shared/components/legal-acceptance-dialog/legal-acceptance-dialog.component';
import { LegalService } from '../../../legal/services/legal.service';
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
};

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, LegalAcceptanceDialogComponent],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  private readonly auth = inject(Auth);
  private readonly fb = inject(FormBuilder);
  private readonly legal = inject(LegalService);
  private readonly route = inject(ActivatedRoute);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly legalDialogVisible = signal(false);
  protected readonly requiredLegalSlugs = computed(() =>
    this.legal.documents().filter((d) => d.requireAcceptance).map((d) => d.slug),
  );

  constructor() {
    void this.legal.loadDocuments();

    const referralCode = this.route.snapshot.queryParamMap.get('ref');
    if (referralCode) {
      this.form.controls.referralCode.setValue(referralCode.toUpperCase());
    }
  }
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

  protected openLegalDialog(): void {
    this.legalDialogVisible.set(true);
  }

  protected onLegalAccepted(): void {
    this.legalDialogVisible.set(false);
    this.register();
  }

  protected submit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.openLegalDialog();
  }

  private register(): void {
    const { fullName, email, password, referralCode } = this.form.getRawValue();
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    this.isSubmitting.set(true);

    this.auth
      .register({
        firstName,
        lastName,
        email,
        password,
        referralCode: referralCode.trim() || undefined,
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            'Commander profile initialized. Check your inbox for a verification link before signing in.',
          );
          this.form.reset();
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
