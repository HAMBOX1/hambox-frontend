import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DecimalPipe } from '@angular/common';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminConfirmDialogComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminLoadingSkeletonComponent,
  AdminSearchBarComponent,
  AdminSectionCardComponent,
  AdminToolbarComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductVariantDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';

const VARIANT_STATUS_OPTIONS = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Archived', value: 'Archived' },
];

const STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: '' },
  ...VARIANT_STATUS_OPTIONS,
];

type VariantFilter = 'all' | 'out-of-stock' | 'draft';

@Component({
  selector: 'app-product-variant-manager',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TableModule,
    TagModule,
    DecimalPipe,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminConfirmDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './product-variant-manager.component.html',
  styleUrl: './product-variant-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductVariantManagerComponent {
  private readonly facade = inject(ProductEditorFacade);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly permissions = PERMISSIONS;
  protected readonly optionGroups = this.facade.optionGroups;
  protected readonly variants = this.facade.variants;
  protected readonly product = this.facade.product;
  protected readonly loading = this.facade.loading;
  protected readonly statusOptions = VARIANT_STATUS_OPTIONS;
  protected readonly statusFilterOptions = STATUS_FILTER_OPTIONS;

  protected readonly generating = signal(false);
  protected readonly saving = signal(false);
  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<ProductVariantDto | null>(null);
  protected readonly editingVariantId = signal<string | null>(null);
  protected readonly editSku = signal('');
  protected readonly editPriceOverride = signal<number | null>(null);
  protected readonly editComparePrice = signal<number | null>(null);
  protected readonly editLowStockThreshold = signal(5);
  protected readonly editStatus = signal('Draft');

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('');
  protected readonly quickFilter = signal<VariantFilter>('all');
  protected readonly selectedVariantIds = signal<string[]>([]);
  protected readonly bulkPrice = signal<number | null>(null);
  protected readonly bulkStatus = signal<string | null>(null);

  protected readonly canGenerate = computed(() =>
    this.optionGroups().length > 0 &&
    this.optionGroups().every((group) => group.options.length > 0),
  );

  protected readonly variantsTable = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const quick = this.quickFilter();

    return this.variants()
      .map((variant) => ({
        ...variant,
        optionsLabel: this.formatOptions(variant),
        displayPrice: variant.priceOverride ?? this.product()?.price ?? 0,
      }))
      .filter((variant) => {
        if (status && variant.status !== status) {
          return false;
        }

        if (quick === 'out-of-stock' && !variant.isOutOfStock) {
          return false;
        }

        if (quick === 'draft' && variant.status !== 'Draft') {
          return false;
        }

        if (!search) {
          return true;
        }

        return (
          variant.sku.toLowerCase().includes(search) ||
          variant.optionsLabel.toLowerCase().includes(search) ||
          variant.status.toLowerCase().includes(search)
        );
      });
  });

  protected readonly allVisibleSelected = computed(() => {
    const visibleIds = this.variantsTable().map((variant) => variant.id);
    return visibleIds.length > 0 && visibleIds.every((id) => this.selectedVariantIds().includes(id));
  });

  protected async generateVariants(): Promise<void> {
    if (!this.canGenerate()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Option groups required',
        detail: 'Add option groups with values before generating variants.',
      });
      return;
    }

    this.generating.set(true);
    try {
      const result = await this.facade.generateVariants();
      if (!result) {
        return;
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Variants generated',
        detail: `Created ${result.createdCount}, preserved ${result.preservedCount} of ${result.totalCombinations} combinations.`,
      });
    } finally {
      this.generating.set(false);
    }
  }

  protected startEdit(variant: ProductVariantDto): void {
    this.editingVariantId.set(variant.id);
    this.editSku.set(variant.sku);
    this.editPriceOverride.set(variant.priceOverride);
    this.editComparePrice.set(variant.comparePrice);
    this.editLowStockThreshold.set(variant.lowStockThreshold);
    this.editStatus.set(variant.status);
  }

  protected cancelEdit(): void {
    this.editingVariantId.set(null);
  }

  protected async saveEdit(variant: ProductVariantDto): Promise<void> {
    const sku = this.editSku().trim();
    if (!sku) {
      return;
    }

    this.saving.set(true);
    try {
      const isVisible = this.editStatus() === 'Active';
      await this.facade.updateVariant(variant.id, {
        sku,
        priceOverride: this.editPriceOverride(),
        comparePrice: this.editComparePrice(),
        sortOrder: variant.sortOrder,
        status: this.editStatus(),
        isVisible,
        lowStockThreshold: this.editLowStockThreshold(),
        optionIds: variant.optionIds,
      });
      this.cancelEdit();
    } finally {
      this.saving.set(false);
    }
  }

  protected requestDelete(variant: ProductVariantDto): void {
    this.deleteTarget.set(variant);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const variant = this.deleteTarget();
    if (!variant) {
      return;
    }

    this.saving.set(true);
    try {
      await this.facade.deleteVariant(variant.id);
      this.deleteDialogOpen.set(false);
      this.deleteTarget.set(null);
      this.selectedVariantIds.update((ids) => ids.filter((id) => id !== variant.id));
    } finally {
      this.saving.set(false);
    }
  }

  protected viewInventory(variant: ProductVariantDto): void {
    const productId = this.product()?.id;
    if (!productId) {
      return;
    }

    void this.router.navigate(['/admin/inventory', variant.id], {
      queryParams: { productId },
    });
  }

  protected toggleSelectAll(checked: boolean): void {
    if (!checked) {
      this.selectedVariantIds.set([]);
      return;
    }

    this.selectedVariantIds.set(this.variantsTable().map((variant) => variant.id));
  }

  protected toggleVariantSelection(variantId: string, checked: boolean): void {
    this.selectedVariantIds.update((ids) => {
      if (checked) {
        return ids.includes(variantId) ? ids : [...ids, variantId];
      }

      return ids.filter((id) => id !== variantId);
    });
  }

  protected isVariantSelected(variantId: string): boolean {
    return this.selectedVariantIds().includes(variantId);
  }

  protected async applyBulkUpdates(): Promise<void> {
    const variantIds = this.selectedVariantIds();
    if (!variantIds.length) {
      return;
    }

    if (this.bulkPrice() === null && !this.bulkStatus()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Nothing to update',
        detail: 'Choose a bulk price or status first.',
      });
      return;
    }

    this.saving.set(true);
    try {
      const updated = await this.facade.bulkUpdateVariants({
        variantIds,
        priceOverride: this.bulkPrice(),
        status: this.bulkStatus(),
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Variants updated',
        detail: `Updated ${updated} variant(s).`,
      });
    } finally {
      this.saving.set(false);
    }
  }

  protected statusSeverity(
    variant: ProductVariantDto,
  ): 'success' | 'warn' | 'danger' | 'secondary' | 'info' {
    if (variant.status === 'Draft') {
      return 'info';
    }
    if (variant.isOutOfStock) {
      return 'danger';
    }
    if (variant.status !== 'Active') {
      return 'secondary';
    }
    return 'success';
  }

  protected deleteDialogMessage(): string {
    const variant = this.deleteTarget();
    return variant ? `Delete variant "${variant.sku}"? This cannot be undone.` : '';
  }

  private formatOptions(variant: ProductVariantDto): string {
    const labels = this.optionGroups()
      .flatMap((group) =>
        group.options
          .filter((option) => variant.optionIds.includes(option.id))
          .map((option) => `${group.displayName}: ${option.label}`),
      );

    return labels.length ? labels.join(' · ') : '—';
  }
}
