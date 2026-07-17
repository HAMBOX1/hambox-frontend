import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminConfirmDialogComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminPageHeaderComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { SupplierMappingDto } from '../../models/supplier.model';
import { SuppliersManagementFacade } from '../../services/suppliers-management.facade';

@Component({
  selector: 'app-supplier-mappings-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TableModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminIconButtonComponent,
    AdminConfirmDialogComponent,
  ],
  providers: [SuppliersManagementFacade, MessageService],
  templateUrl: './supplier-mappings-page.component.html',
  styleUrl: './supplier-mappings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierMappingsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  protected readonly facade = inject(SuppliersManagementFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly supplierId = signal('');
  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      { label: this.translate.instant('ADMIN.SUPPLIERS.LIST.TITLE'), route: '/admin/suppliers' },
      { label: this.facade.detail()?.name ?? '', route: `/admin/suppliers/${this.supplierId()}` },
      { label: this.translate.instant('ADMIN.SUPPLIERS.MAPPINGS.TITLE') },
    ),
  );

  protected readonly mappings = this.facade.mappings;
  protected readonly loading = this.facade.mappingsLoading;
  protected readonly error = this.facade.mappingsError;

  protected readonly dialogOpen = signal(false);
  protected readonly editingMappingId = signal<string | null>(null);
  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<SupplierMappingDto | null>(null);

  protected readonly statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    internalProductId: ['', Validators.required],
    externalProductId: ['', Validators.required],
    externalSku: [''],
    externalName: [''],
    buyingPrice: [0, [Validators.required, Validators.min(0)]],
    currency: ['USD', Validators.required],
    priority: [100, [Validators.required, Validators.min(0)]],
    status: ['Active'],
  });

  ngOnInit(): void {
    const supplierId = this.route.snapshot.paramMap.get('id');
    if (!supplierId) {
      return;
    }

    this.supplierId.set(supplierId);
    void this.facade.loadDetail(supplierId);
    void this.facade.loadMappings(supplierId);
  }

  protected openCreateDialog(): void {
    this.editingMappingId.set(null);
    this.form.reset({
      internalProductId: '',
      externalProductId: '',
      externalSku: '',
      externalName: '',
      buyingPrice: 0,
      currency: 'USD',
      priority: 100,
      status: 'Active',
    });
    this.dialogOpen.set(true);
  }

  protected openEditDialog(mapping: SupplierMappingDto): void {
    this.editingMappingId.set(mapping.id);
    this.form.reset({
      internalProductId: mapping.internalProductId,
      externalProductId: mapping.externalProductId,
      externalSku: mapping.externalSku ?? '',
      externalName: mapping.externalName ?? '',
      buyingPrice: mapping.buyingPrice,
      currency: mapping.currency,
      priority: mapping.priority,
      status: mapping.status,
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
    this.editingMappingId.set(null);
  }

  protected async saveMapping(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const supplierId = this.supplierId();
    const mappingId = this.editingMappingId();

    const success = mappingId
      ? await this.facade.updateMapping(supplierId, mappingId, {
          externalProductId: value.externalProductId,
          externalSku: value.externalSku.trim() ? value.externalSku : null,
          externalName: value.externalName.trim() ? value.externalName : null,
          buyingPrice: value.buyingPrice,
          currency: value.currency,
          priority: value.priority,
          status: value.status as SupplierMappingDto['status'],
        })
      : await this.facade.createMapping(supplierId, {
          internalProductId: value.internalProductId,
          externalProductId: value.externalProductId,
          externalSku: value.externalSku.trim() ? value.externalSku : null,
          externalName: value.externalName.trim() ? value.externalName : null,
          buyingPrice: value.buyingPrice,
          currency: value.currency,
          priority: value.priority,
        });

    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.MAPPING_SAVED'),
        life: 4000,
      });
      this.closeDialog();
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.ACTION_FAILED'),
      detail: this.facade.mappingsError() ?? '',
      life: 5000,
    });
  }

  protected requestDelete(mapping: SupplierMappingDto): void {
    this.deleteTarget.set(mapping);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const mapping = this.deleteTarget();
    const supplierId = this.supplierId();
    if (!mapping) {
      return;
    }

    const success = await this.facade.deleteMapping(supplierId, mapping.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.MAPPING_DELETED'),
        life: 4000,
      });
    }

    this.deleteDialogOpen.set(false);
    this.deleteTarget.set(null);
  }

  protected retryLoad(): void {
    void this.facade.loadMappings(this.supplierId());
  }
}
