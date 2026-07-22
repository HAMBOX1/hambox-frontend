import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  UiAuthCardComponent,
  UiButtonComponent,
  UiFieldComponent,
  UiInputComponent,
  UiPasswordInputComponent,
} from '../../../../shared/components/ui';

import { MaintenanceBypassService } from '../../../../core/maintenance/maintenance-bypass.service';
import { MaintenanceService } from '../../../../core/maintenance/maintenance.service';
import { getControlErrorMessage } from '../../utils/auth-form.utils';

@Component({
  selector: 'app-coming-soon-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    UiAuthCardComponent,
    UiFieldComponent,
    UiInputComponent,
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

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    if (!this.maintenance.enabled() || this.bypass.hasValidToken()) {
      void this.router.navigateByUrl('/home');
    }
  }

  protected fieldError(controlName: string): string | null {
    return getControlErrorMessage(controlName, this.form, {
      email: 'Email',
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
    const { email, password } = this.form.getRawValue();

    try {
      const ok = await this.bypass.verify(email, password);
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
