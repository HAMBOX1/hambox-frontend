import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { PaymentGatewaysManagementFacade } from '../../services/payment-gateways-management.facade';

@Component({
  selector: 'app-payment-gateway-detail-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    PasswordModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminSectionCardComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [PaymentGatewaysManagementFacade, MessageService],
  templateUrl: './payment-gateway-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentGatewayDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  protected readonly facade = inject(PaymentGatewaysManagementFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly gatewayKey = signal('');
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Payment Gateways', route: '/admin/payment-gateways' }, { label: 'Gateway' });

  protected readonly detail = this.facade.detail;
  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailError = this.facade.detailError;
  protected readonly saving = this.facade.saving;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly testResult = this.facade.testResult;

  protected readonly editingCredentials = signal(false);

  protected readonly generalForm = this.fb.nonNullable.group({
    displayName: ['', Validators.required],
    isTestMode: [false],
    baseUrl: [''],
    accountId: [''],
    webhookUrl: [''],
    frontendResultUrl: [''],
  });

  protected readonly credentialsForm = this.fb.nonNullable.group({
    apiKey: [''],
    apiSecret: [''],
    secondaryId: [''],
  });

  constructor() {
    effect(() => {
      const detail = this.detail();
      if (!detail) {
        return;
      }

      this.generalForm.reset({
        displayName: detail.displayName,
        isTestMode: detail.isTestMode,
        baseUrl: detail.baseUrl ?? '',
        accountId: detail.accountId ?? '',
        webhookUrl: detail.webhookUrl ?? '',
        frontendResultUrl: detail.frontendResultUrl ?? '',
      });
    });
  }

  ngOnInit(): void {
    const key = this.route.snapshot.paramMap.get('gatewayKey') ?? '';
    this.gatewayKey.set(key);
    void this.facade.loadDetail(key);
  }

  protected async saveGeneral(): Promise<void> {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }

    const value = this.generalForm.getRawValue();
    const success = await this.facade.updateGeneral(this.gatewayKey(), {
      displayName: value.displayName,
      isTestMode: value.isTestMode,
      baseUrl: value.baseUrl.trim() || null,
      accountId: value.accountId.trim() || null,
      webhookUrl: value.webhookUrl.trim() || null,
      frontendResultUrl: value.frontendResultUrl.trim() || null,
      additionalConfigJson: null,
    });
    this.showResult(success, 'ADMIN.PAYMENT_GATEWAYS.MESSAGES.SAVED', 'ADMIN.PAYMENT_GATEWAYS.MESSAGES.SAVE_FAILED');
  }

  protected startEditCredentials(): void {
    this.credentialsForm.reset({ apiKey: '', apiSecret: '', secondaryId: '' });
    this.editingCredentials.set(true);
  }

  protected cancelEditCredentials(): void {
    this.editingCredentials.set(false);
  }

  protected async saveCredentials(): Promise<void> {
    const value = this.credentialsForm.getRawValue();
    const success = await this.facade.updateCredentials(this.gatewayKey(), {
      apiKey: value.apiKey.trim() || null,
      apiSecret: value.apiSecret.trim() || null,
      secondaryId: value.secondaryId.trim() || null,
    });
    this.showResult(success, 'ADMIN.PAYMENT_GATEWAYS.MESSAGES.CREDENTIALS_SAVED', 'ADMIN.PAYMENT_GATEWAYS.MESSAGES.SAVE_FAILED');
    if (success) {
      this.editingCredentials.set(false);
    }
  }

  protected async toggleEnabled(): Promise<void> {
    const detail = this.detail();
    if (!detail) {
      return;
    }

    const success = detail.isEnabled
      ? await this.facade.disable(this.gatewayKey())
      : await this.facade.enable(this.gatewayKey());
    this.showResult(
      success,
      detail.isEnabled ? 'ADMIN.PAYMENT_GATEWAYS.MESSAGES.DISABLED' : 'ADMIN.PAYMENT_GATEWAYS.MESSAGES.ENABLED',
      'ADMIN.PAYMENT_GATEWAYS.MESSAGES.ACTION_FAILED',
    );
  }

  protected async testConnection(): Promise<void> {
    await this.facade.testConnection(this.gatewayKey());
  }

  private showResult(success: boolean, successKey: string, failKey: string): void {
    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant(successKey), life: 4000 });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant(failKey),
      detail: this.facade.detailError() ?? '',
      life: 5000,
    });
  }
}
