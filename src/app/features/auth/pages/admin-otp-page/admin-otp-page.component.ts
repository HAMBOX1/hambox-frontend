import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';

import { InputOtpModule } from 'primeng/inputotp';
import {
  UiAuthCardComponent,
  UiButtonComponent,
  UiFieldComponent,
} from '../../../../shared/components/ui';

import { finalize } from 'rxjs';



import { ApiError } from '../../../../core/models/api-error.model';

import { ThemeService } from '../../../../core/theme/theme.service';

import { AdminAuth } from '../../services/admin-auth';

import {

  clearAdminOtpChallenge,

  readAdminOtpChallenge,

  saveAdminOtpChallenge,

} from '../../services/admin-otp-state';

import { normalizeOtpCode } from '../../utils/otp-code.utils';



@Component({

  selector: 'app-admin-otp-page',

  standalone: true,

  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputOtpModule,
    UiAuthCardComponent,
    UiFieldComponent,
    UiButtonComponent,
  ],

  templateUrl: './admin-otp-page.component.html',

  styleUrl: './admin-otp-page.component.scss',
  host: { class: 'ui-auth' },

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class AdminOtpPageComponent implements OnInit, OnDestroy {

  private readonly adminAuth = inject(AdminAuth);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  private readonly router = inject(Router);

  protected readonly theme = inject(ThemeService);



  protected readonly isSubmitting = signal(false);

  protected readonly isResending = signal(false);

  protected readonly errorMessage = signal<string | null>(null);

  protected readonly maskedEmail = signal('');
  /** True when the code comes from the admin's authenticator app instead of an e-mail. */
  protected readonly isTotp = signal(false);
  /** Recovery-code entry (any format) instead of the 6-digit authenticator code. */
  protected readonly useRecovery = signal(false);

  protected readonly resendSeconds = signal(0);
  protected readonly submitAttempted = signal(false);

  protected readonly canSubmit = signal(false);

  private challengeId = '';
  private returnUrl = '/admin/dashboard';

  private countdownTimer: ReturnType<typeof setInterval> | null = null;



  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required]],
  });

  protected fieldError(): string | null {
    const control = this.form.controls.code;
    const normalized = normalizeOtpCode(control.value);

    if (!this.submitAttempted() && !control.touched) {
      return null;
    }

    if (!normalized && (control.touched || this.submitAttempted())) {
      return 'Enter the verification code.';
    }

    if (this.submitAttempted() && normalized.length !== 6) {
      return 'Code must be exactly 6 digits.';
    }

    return null;
  }



  ngOnInit(): void {

    const challenge = readAdminOtpChallenge();

    if (!challenge) {

      void this.router.navigate(['/admin/login']);

      return;

    }



    this.challengeId = challenge.challengeId;
    this.returnUrl = challenge.returnUrl;

    this.maskedEmail.set(challenge.maskedEmail);
    this.isTotp.set(challenge.method === 'Totp');

    this.startResendCountdown(challenge.resendAvailableAt);

    this.form.controls.code.valueChanges.subscribe((value) => {
      this.canSubmit.set(normalizeOtpCode(value).length === 6);
      this.cdr.markForCheck();
    });
  }



  ngOnDestroy(): void {

    if (this.countdownTimer) {

      clearInterval(this.countdownTimer);

    }

  }



  protected toggleRecovery(): void {
    this.useRecovery.update((value) => !value);
    this.form.controls.code.reset();
    this.errorMessage.set(null);
    this.submitAttempted.set(false);
    this.canSubmit.set(false);
  }

  protected toggleTheme(): void {

    this.theme.toggle();

  }



  protected submit(): void {
    this.errorMessage.set(null);
    this.submitAttempted.set(true);
    this.form.markAllAsTouched();

    const recovery = this.useRecovery();
    const code = recovery
      ? String(this.form.controls.code.value ?? '').trim()
      : normalizeOtpCode(this.form.controls.code.value);

    this.form.controls.code.setValue(code, { emitEvent: false });
    this.canSubmit.set(recovery ? code.length >= 8 : code.length === 6);

    if ((recovery ? code.length < 8 : code.length !== 6) || this.isSubmitting()) {
      this.cdr.markForCheck();
      return;
    }



    this.isSubmitting.set(true);



    this.adminAuth

      .verifyOtp({ challengeId: this.challengeId, code })

      .pipe(finalize(() => this.isSubmitting.set(false)))

      .subscribe({

        next: async () => {

          clearAdminOtpChallenge();

          await this.adminAuth.syncAccessFromProfile();

          await this.router.navigateByUrl(this.returnUrl);

        },

        error: (error: unknown) => {

          if (error instanceof ApiError) {

            this.errorMessage.set(error.message);

            return;

          }

          this.errorMessage.set('Verification failed. Please try again.');

        },

      });

  }



  protected resend(): void {

    if (this.resendSeconds() > 0 || this.isResending()) {

      return;

    }



    this.errorMessage.set(null);

    this.isResending.set(true);

    this.adminAuth

      .resendOtp(this.challengeId)

      .pipe(finalize(() => this.isResending.set(false)))

      .subscribe({

        next: (challenge) => {

          this.challengeId = challenge.challengeId;

          this.form.controls.code.reset();
          this.submitAttempted.set(false);
          this.canSubmit.set(false);

          saveAdminOtpChallenge({

            challengeId: challenge.challengeId,

            maskedEmail: challenge.maskedEmail,

            expiresAt: challenge.expiresAt,

            resendAvailableAt: challenge.resendAvailableAt,

            returnUrl: this.returnUrl,

          });

          this.startResendCountdown(challenge.resendAvailableAt);

        },

        error: (error: unknown) => {

          if (error instanceof ApiError) {

            this.errorMessage.set(error.message);

          }

        },

      });

  }



  private startResendCountdown(resendAvailableAt: string): void {

    if (this.countdownTimer) {

      clearInterval(this.countdownTimer);

    }



    const update = () => {

      const remaining = Math.max(0, Math.ceil((Date.parse(resendAvailableAt) - Date.now()) / 1000));

      this.resendSeconds.set(remaining);

      if (remaining === 0 && this.countdownTimer) {

        clearInterval(this.countdownTimer);

        this.countdownTimer = null;

      }

    };



    update();

    this.countdownTimer = setInterval(update, 1000);

  }

}


