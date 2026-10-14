import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';
import QRCode from 'qrcode';

import { ApiClientService } from '../../../../../core/api/api-client.service';
import { AUTH_API } from '../../../../../core/api/api-endpoints';
import { ApiError } from '../../../../../core/models/api-error.model';
import {
  AdminErrorAlertComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';

interface TotpStatus {
  readonly isEnabled: boolean;
  readonly enrollmentPending: boolean;
  readonly recoveryCodesRemaining: number;
}

interface TotpEnrollment {
  readonly secret: string;
  readonly otpAuthUri: string;
  readonly issuer: string;
  readonly accountName: string;
}

interface RecoveryCodes {
  readonly recoveryCodes: readonly string[];
}

type Mode = 'idle' | 'enrolling' | 'disabling' | 'regenerating';

/**
 * Self-service two-factor settings for the signed-in admin: enrol an authenticator app (QR + manual key),
 * receive one-time recovery codes, regenerate them, or remove the authenticator again. Removing or
 * regenerating re-asks for the account password plus a current authenticator/recovery code, so a stolen
 * session alone cannot weaken the account.
 */
@Component({
  selector: 'app-two-factor-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [MessageService],
  templateUrl: './two-factor-page.component.html',
  styleUrl: './two-factor-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly messages = inject(MessageService);

  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Two-factor authentication' });

  protected readonly status = signal<TotpStatus | null>(null);
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mode = signal<Mode>('idle');

  protected readonly enrollment = signal<TotpEnrollment | null>(null);
  protected readonly qrDataUrl = signal<string | null>(null);
  protected readonly code = signal('');
  protected readonly password = signal('');
  protected readonly recoveryCodes = signal<readonly string[]>([]);

  protected readonly isEnabled = computed(() => this.status()?.isEnabled ?? false);
  protected readonly formattedSecret = computed(() =>
    (this.enrollment()?.secret ?? '').replace(/(.{4})/g, '$1 ').trim(),
  );

  ngOnInit(): void {
    void this.load();
  }

  protected async startEnrollment(): Promise<void> {
    await this.run(async () => {
      const result = await firstValueFrom(this.api.post<TotpEnrollment>(AUTH_API.adminTotpEnroll, {}));
      this.enrollment.set(result);
      this.qrDataUrl.set(await QRCode.toDataURL(result.otpAuthUri, { margin: 1, width: 220 }));
      this.code.set('');
      this.mode.set('enrolling');
    }, 'Could not start the setup.');
  }

  protected async confirmEnrollment(): Promise<void> {
    const code = this.code().trim();
    if (!code) {
      return;
    }

    await this.run(async () => {
      const result = await firstValueFrom(this.api.post<RecoveryCodes>(AUTH_API.adminTotpConfirm, { code }));
      this.recoveryCodes.set(result.recoveryCodes);
      this.enrollment.set(null);
      this.qrDataUrl.set(null);
      this.code.set('');
      this.mode.set('idle');
      this.messages.add({ severity: 'success', summary: 'Authenticator app enabled', life: 4000 });
      await this.load();
    }, 'That code did not match. Check the time on your phone and try the next code.');
  }

  protected openDisable(): void {
    this.password.set('');
    this.code.set('');
    this.error.set(null);
    this.mode.set('disabling');
  }

  protected openRegenerate(): void {
    this.password.set('');
    this.code.set('');
    this.error.set(null);
    this.mode.set('regenerating');
  }

  protected cancel(): void {
    this.mode.set('idle');
    this.enrollment.set(null);
    this.qrDataUrl.set(null);
    this.code.set('');
    this.password.set('');
    this.error.set(null);
  }

  protected async confirmDisable(): Promise<void> {
    if (!this.password() || !this.code().trim()) {
      return;
    }

    await this.run(async () => {
      await firstValueFrom(
        this.api.post<void>(AUTH_API.adminTotpDisable, { password: this.password(), code: this.code().trim() }),
      );
      this.recoveryCodes.set([]);
      this.mode.set('idle');
      this.password.set('');
      this.code.set('');
      this.messages.add({ severity: 'success', summary: 'Authenticator app removed', life: 4000 });
      await this.load();
    }, 'Could not remove the authenticator.');
  }

  protected async confirmRegenerate(): Promise<void> {
    if (!this.password() || !this.code().trim()) {
      return;
    }

    await this.run(async () => {
      const result = await firstValueFrom(
        this.api.post<RecoveryCodes>(AUTH_API.adminTotpRecoveryCodes, {
          password: this.password(),
          code: this.code().trim(),
        }),
      );
      this.recoveryCodes.set(result.recoveryCodes);
      this.mode.set('idle');
      this.password.set('');
      this.code.set('');
      await this.load();
    }, 'Could not generate new recovery codes.');
  }

  protected async copyRecoveryCodes(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.recoveryCodes().join('\n'));
      this.messages.add({ severity: 'success', summary: 'Recovery codes copied', life: 2500 });
    } catch {
      this.messages.add({ severity: 'warn', summary: 'Copy failed — select the codes and copy them manually.', life: 4000 });
    }
  }

  protected downloadRecoveryCodes(): void {
    const blob = new Blob(
      [`HAMBOX admin recovery codes\nEach code works once.\n\n${this.recoveryCodes().join('\n')}\n`],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hambox-recovery-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  protected dismissRecoveryCodes(): void {
    this.recoveryCodes.set([]);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.status.set(await firstValueFrom(this.api.get<TotpStatus>(AUTH_API.adminTotp)));
    } catch (error) {
      this.error.set(error instanceof ApiError && error.message ? error.message : 'Could not load your two-factor settings.');
    } finally {
      this.loading.set(false);
    }
  }

  private async run(action: () => Promise<void>, fallback: string): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(error instanceof ApiError && error.message ? error.message : fallback);
    } finally {
      this.busy.set(false);
    }
  }
}
