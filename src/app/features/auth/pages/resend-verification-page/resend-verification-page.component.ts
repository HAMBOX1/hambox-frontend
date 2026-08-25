import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { UiTurnstileComponent } from '../../../../shared/components/ui';
import { Auth } from '../../services/auth';
import { applyServerValidationErrors, getControlErrorMessage } from '../../utils/auth-form.utils';

const FIELD_LABELS = { email: 'Email' };

@Component({
  selector: 'app-resend-verification-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InputTextModule, ButtonModule, UiTurnstileComponent],
  templateUrl: './resend-verification-page.component.html',
  styleUrl: './resend-verification-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResendVerificationPageComponent {
  private readonly auth = inject(Auth);
  private readonly fb = inject(FormBuilder);

  private readonly turnstileWidget = viewChild.required(UiTurnstileComponent);
  protected readonly turnstileToken = signal<string | null>(null);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected fieldError(controlName: string): string | null {
    return getControlErrorMessage(controlName, this.form, FIELD_LABELS);
  }

  protected submit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.form.markAllAsTouched();

    const turnstileToken = this.turnstileToken();
    if (this.form.invalid || this.isSubmitting() || !turnstileToken) {
      return;
    }

    this.isSubmitting.set(true);
    const { email } = this.form.getRawValue();

    this.auth
      .resendVerification({ email, turnstileToken })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            'If an account exists and is unverified, a new verification email has been sent.',
          );
          this.form.reset();
          this.turnstileToken.set(null);
          this.turnstileWidget().reset();
        },
        error: (error: unknown) => {
          this.turnstileToken.set(null);
          this.turnstileWidget().reset();

          if (error instanceof ApiError) {
            applyServerValidationErrors(this.form, error);
            this.errorMessage.set(error.message);
            return;
          }

          this.errorMessage.set('Unable to resend verification. Please try again.');
        },
      });
  }
}
