import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { finalize } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { Auth } from '../../services/auth';
import { CartFacade } from '../../../cart/services/cart.facade';
import {
  applyServerValidationErrors,
  getControlErrorMessage,
} from '../../utils/auth-form.utils';

const FIELD_LABELS = {
  email: 'Email or phone',
  password: 'Password',
};

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, CheckboxModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly auth = inject(Auth);
  private readonly cartFacade = inject(CartFacade);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
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
    const { email, password } = this.form.getRawValue();

    this.auth
      .login({ email, password })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          void this.cartFacade.mergeGuestCartIfNeeded().then(() => {
            const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
            void this.router.navigateByUrl(returnUrl);
          });
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
