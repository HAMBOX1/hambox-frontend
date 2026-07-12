import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminSectionCardComponent,
  AdminStatGridComponent,
  AdminStatCardComponent,
  AdminStatusBadgeComponent,
  AdminToolbarComponent,
} from '../../../../shared/components/admin';
import { UiButtonComponent, UiFieldComponent, UiInputComponent } from '../../../../shared/components/ui';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductVariantDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';

@Component({
  selector: 'app-variant-codes-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    TableModule,
    SelectModule,
    PaginatorModule,
    DecimalPipe,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminStatGridComponent,
    AdminStatCardComponent,
    AdminSectionCardComponent,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminErrorAlertComponent,
    AdminStatusBadgeComponent,
    UiButtonComponent,
    UiFieldComponent,
    UiInputComponent,
  ],
  providers: [ProductEditorFacade],
  templateUrl: './variant-codes-page.component.html',
  styleUrl: './variant-codes-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantCodesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly facade = inject(ProductEditorFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly loading = this.facade.loading;
  protected readonly inventoryLoading = this.facade.inventoryLoading;
  protected readonly error = this.facade.error;
  protected readonly product = this.facade.product;
  protected readonly variant = this.facade.selectedVariant;
  protected readonly statistics = this.facade.statistics;
  protected readonly batches = this.facade.batches;
  protected readonly codes = this.facade.codes;
  protected readonly codesPage = this.facade.codesPage;
  protected readonly codesPageSize = this.facade.codesPageSize;

  protected readonly productId = signal('');
  protected readonly variantId = signal('');
  protected readonly newBatchName = signal('');
  protected readonly bulkCodes = signal('');
  protected readonly importing = signal(false);
  protected readonly codeSearch = signal('');
  protected readonly codeStatusFilter = signal('');

  protected readonly statusFilterOptions = [
    { label: 'All statuses', value: '' },
    { label: 'Available', value: 'Available' },
    { label: 'Reserved', value: 'Reserved' },
    { label: 'Sold', value: 'Sold' },
  ];

  protected readonly breadcrumbs = computed(() => {
    const product = this.product();
    const variant = this.variant();
    return [
      { label: 'Inventory', routerLink: '/admin/inventory' },
      {
        label: product?.nameEn ?? 'Product',
        routerLink: product ? `/admin/inventory/${product.id}/edit` : undefined,
      },
      {
        label: variant?.sku ?? 'Variant',
        routerLink: product && variant
          ? `/admin/inventory/${product.id}/edit`
          : undefined,
      },
      { label: 'Codes' },
    ];
  });

  protected readonly codesTable = computed(() => [...this.codes()]);
  protected readonly batchesTable = computed(() => [...this.batches()]);

  protected readonly statItems = computed(() => {
    const stats = this.statistics();
    if (!stats) {
      return [];
    }

    return [
      { label: 'Available', value: String(stats.available), tone: 'success' as const },
      { label: 'Reserved', value: String(stats.reserved), tone: 'info' as const },
      { label: 'Sold', value: String(stats.sold), tone: 'default' as const },
      { label: 'Remaining', value: String(stats.available), tone: 'success' as const },
    ];
  });

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('productId') ?? '';
    const variantId = this.route.snapshot.paramMap.get('variantId') ?? '';
    this.productId.set(productId);
    this.variantId.set(variantId);

    void this.bootstrap(productId, variantId);
  }

  protected optionSummary(variant: ProductVariantDto): string {
    const labels = this.facade
      .optionGroups()
      .flatMap((group) => group.options)
      .filter((option) => variant.optionIds.includes(option.id))
      .map((option) => option.label);

    return labels.length ? labels.join(' · ') : variant.sku;
  }

  protected async createBatch(): Promise<void> {
    const name = this.newBatchName().trim();
    if (!name) {
      return;
    }

    await this.facade.createBatch({ name, currency: 'USD', purchaseCost: 0 });
    this.newBatchName.set('');
  }

  protected async importCodes(): Promise<void> {
    const batch = this.batches()[0];
    const raw = this.bulkCodes().trim();
    if (!batch || !raw) {
      return;
    }

    const codes = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    this.importing.set(true);
    try {
      const ok = await this.facade.importCodes(codes);
      if (ok) {
        this.bulkCodes.set('');
      }
    } finally {
      this.importing.set(false);
    }
  }

  protected onFileSelected(event: Event, kind: 'txt' | 'csv'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const lines = kind === 'csv'
        ? text.split(/\r?\n/).map((line) => line.split(',')[0]?.trim() ?? '').filter(Boolean)
        : text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      this.bulkCodes.set(lines.join('\n'));
      input.value = '';
    };
    reader.readAsText(file);
  }

  protected exportCodes(): void {
    const lines = this.codesTable().map((code) => code.digitalCode);
    if (!lines.length) {
      return;
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `codes-${this.variant()?.sku ?? 'export'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected async applyCodeFilters(): Promise<void> {
    const variantId = this.variantId();
    if (!variantId) {
      return;
    }

    await this.facade.selectVariant(variantId, {
      pageNumber: 1,
      pageSize: this.codesPageSize(),
      status: this.codeStatusFilter() || undefined,
      searchTerm: this.codeSearch().trim() || undefined,
    });
  }

  protected async onPaginatorChange(event: { page?: number }): Promise<void> {
    await this.onPageChange((event.page ?? 0) + 1);
  }

  protected async onPageChange(page: number): Promise<void> {
    const variantId = this.variantId();
    if (!variantId) {
      return;
    }

    await this.facade.selectVariant(variantId, {
      pageNumber: page,
      pageSize: this.codesPageSize(),
      status: this.codeStatusFilter() || undefined,
      searchTerm: this.codeSearch().trim() || undefined,
    });
  }

  private async bootstrap(productId: string, variantId: string): Promise<void> {
    if (!productId || !variantId) {
      return;
    }

    await this.facade.load(productId);
    await this.facade.selectVariant(variantId);
  }
}
