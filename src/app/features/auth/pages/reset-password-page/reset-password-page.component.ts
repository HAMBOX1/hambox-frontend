import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { finalize } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { Auth } from '../../services/auth';
import {
  applyServerValidationErrors,
  getControlErrorMessage,
  passwordsMatchValidator,
} from '../../utils/auth-form.utils';

const FIELD_LABELS = {
  newPassword: 'New password',
  confirmPassword: 'Confirm password',
};

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PasswordModule, ButtonModule],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPageComponent implements OnInit {
  private readonly auth = inject(Auth);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly tokenMissing = signal(false);

  private token = '';

  protected readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.tokenMissing.set(!this.token);
  }

  protected fieldError(controlName: string): string | null {
    return getControlErrorMessage(controlName, this.form, FIELD_LABELS);
  }

  protected submit(): void {
    if (!this.token) {
      this.errorMessage.set('Reset token is missing or invalid.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    const { newPassword } = this.form.getRawValue();

    this.auth
      .resetPassword({ token: this.token, newPassword })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Password updated. You can now sign in with your new password.');
          this.form.reset();
          void this.router.navigate(['/auth/login']);
        },
        error: (error: unknown) => {
          if (error instanceof ApiError) {
            applyServerValidationErrors(this.form, error);
            this.errorMessage.set(error.message);
            return;
          }

          this.errorMessage.set('Unable to reset your password. Please request a new link.');
        },
      });
  }
}
