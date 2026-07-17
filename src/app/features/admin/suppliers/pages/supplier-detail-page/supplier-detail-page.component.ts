import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { HasUnsavedChanges } from '../../../../../core/guards/unsaved-changes.guard';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminConfirmDialogComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminUnsavedChangesDialogComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { SUPPLIER_AUTH_TYPE_OPTIONS, SupplierAuthenticationType } from '../../models/supplier.model';
import { SuppliersManagementFacade } from '../../services/suppliers-management.facade';

@Component({
  selector: 'app-supplier-detail-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    InputNumberModule,
    PasswordModule,
    SelectModule,
    TextareaModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminSectionCardComponent,
    AdminUnsavedChangesDialogComponent,
    AdminConfirmDialogComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [SuppliersManagementFacade, MessageService],
  templateUrl: './supplier-detail-page.component.html',
  styleUrl: './supplier-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierDetailPageComponent implements OnInit, HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);
  protected readonly facade = inject(SuppliersManagementFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly authTypeOptions = [...SUPPLIER_AUTH_TYPE_OPTIONS];
  protected readonly supplierId = signal<string | null>(null);
  protected readonly isCreateMode = computed(() => this.supplierId() === null);

  protected readonly detail = this.facade.detail;
  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailError = this.facade.detailError;
  protected readonly saving = this.facade.saving;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly providerTypes = this.facade.providerTypes;
  protected readonly testResult = this.facade.testResult;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    providerType: ['Manual', Validators.required],
    authenticationType: ['None' as SupplierAuthenticationType, Validators.required],
    baseUrl: [''],
    priority: [100, [Validators.required, Validators.min(0)]],
    supportsInventorySync: [false],
    supportsPriceSync: [false],
    supportsReservations: [false],
    supportsOrderStatus: [false],
    supportsWebhooks: [false],
    settingsJson: [''],
  });

  protected readonly credentialsForm = this.fb.nonNullable.group({
    apiKey: [''],
    apiSecret: [''],
    username: [''],
    password: [''],
    bearerToken: [''],
    oAuthSettingsJson: [''],
  });

  protected readonly settingsJsonError = signal<string | null>(null);

  protected readonly deleteDialogOpen = signal(false);
  protected readonly unsavedDialogOpen = signal(false);
  private unsavedDialogResolver: ((action: 'save' | 'discard' | 'cancel') => void) | null = null;

  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      { label: this.translate.instant('ADMIN.SUPPLIERS.LIST.TITLE'), route: '/admin/suppliers' },
      { label: this.isCreateMode() ? this.translate.instant('ADMIN.SUPPLIERS.DETAIL.NEW') : (this.detail()?.name ?? '') },
    ),
  );

  ngOnInit(): void {
    void this.facade.loadProviderTypes();

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.supplierId.set(id);
    void this.facade.loadDetail(id).then(() => this.patchForm());
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || !this.validateSettingsJson()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const id = this.supplierId();

    if (this.isCreateMode()) {
      const createdId = await this.facade.createSupplier({
        name: value.name,
        code: value.code,
        providerType: value.providerType,
        authenticationType: value.authenticationType,
        baseUrl: value.baseUrl.trim() ? value.baseUrl : null,
        priority: value.priority,
        supportsInventorySync: value.supportsInventorySync,
        supportsPriceSync: value.supportsPriceSync,
        supportsReservations: value.supportsReservations,
        supportsOrderStatus: value.supportsOrderStatus,
        supportsWebhooks: value.supportsWebhooks,
      });

      if (createdId) {
        this.form.markAsPristine();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.CREATED'),
          life: 4000,
        });
        void this.router.navigate(['/admin/suppliers', createdId]);
        return;
      }

      this.showSaveError();
      return;
    }

    if (!id) {
      return;
    }

    const success = await this.facade.updateSupplier(id, {
      name: value.name,
      providerType: value.providerType,
      authenticationType: value.authenticationType,
      baseUrl: value.baseUrl.trim() ? value.baseUrl : null,
      supportsInventorySync: value.supportsInventorySync,
      supportsPriceSync: value.supportsPriceSync,
      supportsReservations: value.supportsReservations,
      supportsOrderStatus: value.supportsOrderStatus,
      supportsWebhooks: value.supportsWebhooks,
    });

    if (success) {
      await this.saveSettingsIfChanged(id, value.settingsJson);
      this.form.markAsPristine();
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.SAVED'),
        life: 4000,
      });
      return;
    }

    this.showSaveError();
  }

  protected async saveCredentials(): Promise<void> {
    const id = this.supplierId();
    if (!id) {
      return;
    }

    const value = this.credentialsForm.getRawValue();
    const success = await this.facade.updateCredentials(id, {
      apiKey: value.apiKey.trim() ? value.apiKey : null,
      apiSecret: value.apiSecret.trim() ? value.apiSecret : null,
      username: value.username.trim() ? value.username : null,
      password: value.password.trim() ? value.password : null,
      bearerToken: value.bearerToken.trim() ? value.bearerToken : null,
      oAuthSettingsJson: value.oAuthSettingsJson.trim() ? value.oAuthSettingsJson : null,
    });

    if (success) {
      this.credentialsForm.reset({ apiKey: '', apiSecret: '', username: '', password: '', bearerToken: '', oAuthSettingsJson: '' });
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.CREDENTIALS_SAVED'),
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.ACTION_FAILED'),
      detail: this.facade.detailError() ?? '',
      life: 5000,
    });
  }

  protected async testConnection(): Promise<void> {
    const id = this.supplierId();
    if (id) {
      await this.facade.testConnection(id);
    }
  }

  protected async toggleEnabled(): Promise<void> {
    const id = this.supplierId();
    const detail = this.detail();
    if (!id || !detail) {
      return;
    }

    const success = detail.isEnabled ? await this.facade.disableSupplier(id) : await this.facade.enableSupplier(id);
    if (!success) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.ACTION_FAILED'),
        detail: this.facade.detailError() ?? '',
        life: 5000,
      });
    }
  }

  protected requestDelete(): void {
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const id = this.supplierId();
    if (!id) {
      return;
    }

    const success = await this.facade.deleteSupplier(id);
    if (success) {
      this.deleteDialogOpen.set(false);
      void this.router.navigate(['/admin/suppliers']);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.ACTION_FAILED'),
      life: 5000,
    });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

  promptUnsavedChanges(): Promise<'save' | 'discard' | 'cancel'> {
    return new Promise((resolve) => {
      this.unsavedDialogResolver = resolve;
      this.unsavedDialogOpen.set(true);
    });
  }

  protected onUnsavedDialogVisibleChange(visible: boolean): void {
    this.unsavedDialogOpen.set(visible);
    if (!visible && this.unsavedDialogResolver) {
      this.resolveUnsavedDialog('cancel');
    }
  }

  protected async onUnsavedSave(): Promise<void> {
    await this.save();
    this.resolveUnsavedDialog(this.form.pristine ? 'save' : 'cancel');
  }

  protected onUnsavedDiscard(): void {
    this.resolveUnsavedDialog('discard');
  }

  protected validateSettingsJson(): boolean {
    const raw = this.form.controls.settingsJson.value;
    if (!raw.trim()) {
      this.settingsJsonError.set(null);
      return true;
    }

    try {
      JSON.parse(raw);
      this.settingsJsonError.set(null);
      return true;
    } catch {
      this.settingsJsonError.set(this.translate.instant('ADMIN.SUPPLIERS.DETAIL.INVALID_JSON'));
      return false;
    }
  }

  private async saveSettingsIfChanged(id: string, settingsJson: string): Promise<void> {
    const current = this.detail()?.settingsJson ?? '';
    if (settingsJson === current) {
      return;
    }

    await this.facade.updateSettings(id, { settingsJson: settingsJson.trim() ? settingsJson : null });
  }

  private patchForm(): void {
    const detail = this.detail();
    if (!detail) {
      return;
    }

    this.form.reset({
      name: detail.name,
      code: detail.code,
      providerType: detail.providerType,
      authenticationType: detail.authenticationType,
      baseUrl: detail.baseUrl ?? '',
      priority: detail.priority,
      supportsInventorySync: detail.supportsInventorySync,
      supportsPriceSync: detail.supportsPriceSync,
      supportsReservations: detail.supportsReservations,
      supportsOrderStatus: detail.supportsOrderStatus,
      supportsWebhooks: detail.supportsWebhooks,
      settingsJson: detail.settingsJson ?? '',
    });
    this.form.controls.code.disable();
  }

  private resolveUnsavedDialog(action: 'save' | 'discard' | 'cancel'): void {
    this.unsavedDialogOpen.set(false);
    this.unsavedDialogResolver?.(action);
    this.unsavedDialogResolver = null;
  }

  private showSaveError(): void {
    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.SAVE_FAILED'),
      detail: this.facade.detailError() ?? '',
      life: 5000,
    });
  }
}
