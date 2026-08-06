import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  UiAuthCardComponent,
  UiButtonComponent,
  UiFieldComponent,
  UiPasswordInputComponent,
} from '../../../../shared/components/ui';

import { MaintenanceBypassService } from '../../../../core/maintenance/maintenance-bypass.service';
import { MaintenanceService } from '../../../../core/maintenance/maintenance.service';
import { getControlErrorMessage } from '../../utils/auth-form.utils';

/**
 * At most one automatic bounce out of /coming-soon per page load. Landing here a second time
 * means the server disagrees with our local access state, and bouncing again would put the
 * storefront in a redirect loop. A real hard refresh resets this and gets a fresh attempt.
 */
let hasAutoRedirected = false;

@Component({
  selector: 'app-coming-soon-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    UiAuthCardComponent,
    UiFieldComponent,
    UiPasswordInputComponent,
    UiButtonComponent,
  ],
  templateUrl: './coming-soon-page.component.html',
  styleUrl: './coming-soon-page.component.scss',
  host: { class: 'ui-auth' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoonPageComponent {
  private readonly bypass = inject(MaintenanceBypassService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly maintenance = inject(MaintenanceService);

  protected readonly showLoginForm = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // Mirrors the storefront footer's default social links (see storefront category
  // Platform Settings). Hardcoded rather than fetched so this page still renders
  // during the backend outages maintenance mode is meant to cover.
  protected readonly socialLinks = [
    { label: 'WhatsApp', url: 'https://wa.me/201555413000', icon: 'assets/images/footer/whatsapp.svg' },
    { label: 'Telegram', url: 'https://t.me/hambox', icon: 'assets/images/footer/telegram.svg' },
    { label: 'Facebook', url: 'https://facebook.com/hamboxstore', icon: 'assets/images/footer/facebook.svg' },
  ] as const;

  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required]],
  });

  constructor() {
    if (hasAutoRedirected) {
      return;
    }

    if (!this.maintenance.enabled() || this.bypass.hasValidToken()) {
      hasAutoRedirected = true;
      void this.router.navigateByUrl('/home');
    }
  }

  protected fieldError(controlName: string): string | null {
    return getControlErrorMessage(controlName, this.form, {
      password: 'Password',
    });
  }

  protected async submit(): Promise<void> {
    this.errorMessage.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    const { password } = this.form.getRawValue();

    try {
      const ok = await this.bypass.verify(password);
      if (ok) {
        await this.router.navigateByUrl('/home');
        return;
      }

      this.errorMessage.set('Invalid credentials.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
