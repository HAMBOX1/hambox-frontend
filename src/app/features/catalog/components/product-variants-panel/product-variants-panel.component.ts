import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminEmptyStateComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductVariantDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import { isDuplicateCombination } from '../../../product-details/utils/storefront-variant.resolver';
import { ProductVariantCodesDialogComponent } from '../product-variant-codes-dialog/product-variant-codes-dialog.component';

@Component({
  selector: 'app-product-variants-panel',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    MultiSelectModule,
    ChipModule,
    TableModule,
    TagModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    ProductVariantCodesDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './product-variants-panel.component.html',
  styleUrl: './product-variants-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductVariantsPanelComponent {
  private readonly facade = inject(ProductEditorFacade);
  private readonly messageService = inject(MessageService);

  protected readonly permissions = PERMISSIONS;
  protected readonly optionGroups = this.facade.optionGroups;
  protected readonly variants = this.facade.variants;
  protected readonly loading = this.facade.loading;

  protected readonly newGroupKey = signal('');
  protected readonly newGroupLabel = signal('');
  protected readonly newSku = signal('');
  protected readonly selectedOptionIds = signal<string[]>([]);
  protected readonly pendingOptionByGroup = signal<Record<string, string>>({});
  protected readonly creatingGroup = signal(false);
  protected readonly creatingVariant = signal(false);
  protected readonly selectedVariantForCodes = signal<ProductVariantDto | null>(null);
  protected readonly codesDialogVisible = signal(false);

  protected readonly variantsTable = computed(() =>
    this.variants().map((variant) => ({
      ...variant,
      optionsLabel: this.formatOptions(variant),
      stockLabel: variant.isOutOfStock ? 'Out of Stock' : `${variant.availableStock} available`,
    })),
  );

  protected optionChoices(): { label: string; value: string }[] {
    return this.optionGroups().flatMap((group) =>
      group.options.map((option) => ({
        label: `${group.displayName}: ${option.label}`,
        value: option.id,
      })),
    );
  }

  protected pendingOption(groupId: string): string {
    return this.pendingOptionByGroup()[groupId] ?? '';
  }

  protected setPendingOption(groupId: string, value: string): void {
    this.pendingOptionByGroup.update((current) => ({ ...current, [groupId]: value }));
  }

  protected async createOptionGroup(): Promise<void> {
    const key = this.newGroupKey().trim();
    const label = this.newGroupLabel().trim();
    if (!key || !label) {
      return;
    }

    this.creatingGroup.set(true);
    try {
      await this.facade.createOptionGroup({
        key,
        displayName: label,
        sortOrder: this.optionGroups().length,
        isRequired: true,
      });
      this.newGroupKey.set('');
      this.newGroupLabel.set('');
    } finally {
      this.creatingGroup.set(false);
    }
  }

  protected async addOptionToGroup(groupId: string): Promise<void> {
    const label = this.pendingOption(groupId).trim();
    if (!label) {
      return;
    }

    const value = label.toLowerCase().replace(/\s+/g, '-');
    const group = this.optionGroups().find((item) => item.id === groupId);
    await this.facade.createOption(groupId, {
      value,
      label,
      sortOrder: group?.options.length ?? 0,
    });
    this.setPendingOption(groupId, '');
  }

  protected async createVariant(): Promise<void> {
    const sku = this.newSku().trim();
    const optionIds = this.selectedOptionIds();
    if (!sku) {
      return;
    }

    if (isDuplicateCombination(this.variants(), optionIds)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Duplicate combination',
        detail: 'A variant with this option combination already exists.',
      });
      return;
    }

    this.creatingVariant.set(true);
    try {
      await this.facade.createVariant({
        sku,
        sortOrder: this.variants().length,
        lowStockThreshold: 5,
        optionIds,
      });
      this.newSku.set('');
      this.selectedOptionIds.set([]);
    } finally {
      this.creatingVariant.set(false);
    }
  }

  protected async manageCodes(variant: ProductVariantDto): Promise<void> {
    this.selectedVariantForCodes.set(variant);
    await this.facade.selectVariant(variant.id);
    this.codesDialogVisible.set(true);
  }

  protected statusSeverity(variant: ProductVariantDto): 'success' | 'warn' | 'danger' | 'secondary' {
    if (variant.isOutOfStock) {
      return 'danger';
    }
    if (variant.status !== 'Active') {
      return 'secondary';
    }
    return 'success';
  }

  private formatOptions(variant: ProductVariantDto): string {
    const labels = this.optionGroups()
      .flatMap((group) => group.options)
      .filter((option) => variant.optionIds.includes(option.id))
      .map((option) => option.label);

    return labels.length ? labels.join(' · ') : '—';
  }
}
