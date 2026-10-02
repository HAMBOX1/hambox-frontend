import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../../../core/api/api-client.service';
import { LOCALIZATION_API } from '../../../../../core/api/api-endpoints';
import { ExchangeRatesResponse } from '../../../../../core/currency/currency.model';
import { Category } from '../../../../catalog/models/category.model';
import { CategoryApiService } from '../../../../catalog/services/category-api.service';
import { InventoryApiService } from '../../../../catalog/services/inventory-api.service';
import { ProductApiService } from '../../../../catalog/services/product-api.service';
import {
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { SupplierCatalogItemDto } from '../../models/supplier.model';
import { SuppliersManagementFacade } from '../../services/suppliers-management.facade';

const PAGE_SIZE = 50;

/**
 * Read-only browse of everything a supplier's provider reports in its catalog — distinct from
 * "Map Products" (pairs catalog items against our own products) and "Mappings" (lists only the
 * pairs already made). This page answers "what does this supplier even sell?" without requiring
 * a search term or a mapping decision first.
 */
@Component({
  selector: 'app-supplier-catalog-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    DecimalPipe,
    TranslatePipe,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminSearchBarComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [SuppliersManagementFacade, MessageService],
  templateUrl: './supplier-catalog-page.component.html',
  styleUrl: './supplier-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierCatalogPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly api = inject(ApiClientService);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly productApi = inject(ProductApiService);
  private readonly inventoryApi = inject(InventoryApiService);
  protected readonly facade = inject(SuppliersManagementFacade);

  protected readonly supplierId = signal('');
  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      { label: this.translate.instant('ADMIN.SUPPLIERS.LIST.TITLE'), route: '/admin/suppliers' },
      { label: this.facade.detail()?.name ?? '', route: `/admin/suppliers/${this.supplierId()}` },
      { label: this.translate.instant('ADMIN.SUPPLIERS.CATALOG.TITLE') },
    ),
  );

  protected readonly searchTerm = signal('');
  protected readonly items = signal<readonly SupplierCatalogItemDto[]>([]);
  protected readonly page = signal(1);
  protected readonly hasMore = signal(false);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal(false);
  protected readonly unsupportedMessage = signal<string | null>(null);

  protected readonly importItem = signal<SupplierCatalogItemDto | null>(null);
  protected readonly importOpen = signal(false);
  protected readonly importing = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected importNameEn = '';
  protected importNameAr = '';
  protected importCategoryId: string | null = null;
  protected importPrice = 0;
  private importDescriptionHtml = '';

  private searchToken = 0;
  private usdRates: Readonly<Record<string, number>> | null = null;

  ngOnInit(): void {
    const supplierId = this.route.snapshot.paramMap.get('id');
    if (!supplierId) {
      return;
    }

    this.supplierId.set(supplierId);
    void this.facade.loadDetail(supplierId);
    void this.runSearch(1, false);
  }

  protected onSearchChange(term: string): void {
    this.searchTerm.set(term);
    void this.runSearch(1, false);
  }

  protected async openImport(item: SupplierCatalogItemDto): Promise<void> {
    this.importItem.set(item);
    this.importNameEn = item.name;
    this.importNameAr = item.name;
    this.importPrice = 0;
    this.importDescriptionHtml = this.toHtml(item.description);
    this.importOpen.set(true);

    await this.loadCategories();
    this.importPrice = await this.estimateUsdPrice(item);
  }

  protected closeImport(): void {
    if (!this.importing()) {
      this.importOpen.set(false);
    }
  }

  protected async confirmImport(): Promise<void> {
    const item = this.importItem();
    if (!item || !this.importCategoryId || !this.importNameEn.trim() || this.importing()) {
      return;
    }

    this.importing.set(true);
    let productId: string | null = null;
    try {
      const nameEn = this.importNameEn.trim();
      const nameAr = this.importNameAr.trim() || nameEn;
      productId = await firstValueFrom(
        this.productApi.createProduct({
          nameEn,
          nameAr,
          descriptionEn: this.importDescriptionHtml,
          descriptionAr: this.importDescriptionHtml,
          price: Math.max(0, this.importPrice ?? 0),
          categoryId: this.importCategoryId,
        }),
      );

      const variantId = await firstValueFrom(
        this.inventoryApi.createVariant(productId, {
          sku: this.buildSku(nameEn),
          sortOrder: 0,
          lowStockThreshold: 5,
          optionIds: [],
        }),
      );

      await firstValueFrom(this.inventoryApi.setVariantFulfillmentMode(variantId, { fulfillmentMode: 'SupplierOnly' }));

      const mapped = await this.facade.createMapping(this.supplierId(), {
        internalProductId: productId,
        internalProductVariantId: variantId,
        externalProductId: item.externalProductId,
        externalSku: null,
        externalName: item.name,
        buyingPrice: item.minFaceValue ?? 0,
        currency: item.currency,
        priority: 100,
      });

      if (!mapped) {
        throw new Error('mapping-failed');
      }

      const imageImported = await this.importImage(productId, item.imageUrl);

      this.importOpen.set(false);
      this.messages.add({
        severity: imageImported ? 'success' : 'warn',
        summary: this.translate.instant('ADMIN.SUPPLIERS.CATALOG.IMPORT_SUCCESS'),
      });
      await this.router.navigate(['/admin/products', productId, 'edit']);
    } catch {
      this.messages.add({
        severity: 'error',
        summary: this.translate.instant(
          productId ? 'ADMIN.SUPPLIERS.CATALOG.IMPORT_PARTIAL' : 'ADMIN.SUPPLIERS.CATALOG.IMPORT_FAILED',
        ),
        life: 8000,
      });
    } finally {
      this.importing.set(false);
    }
  }

  /** Best-effort: a missing/blocked supplier image must never undo an otherwise complete import. */
  private async importImage(productId: string, imageUrl: string | null | undefined): Promise<boolean> {
    if (!imageUrl) {
      return true;
    }

    try {
      await firstValueFrom(this.productApi.importProductImageFromUrl(productId, imageUrl));
      return true;
    } catch {
      return false;
    }
  }

  private toHtml(text: string | null | undefined): string {
    if (!text?.trim()) {
      return '';
    }

    const escape = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return text
      .trim()
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escape(paragraph).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  private async loadCategories(): Promise<void> {
    if (this.categories().length > 0) {
      return;
    }

    try {
      const result = await firstValueFrom(this.categoryApi.getCategories({ pageNumber: 1, pageSize: 200 }));
      this.categories.set([...result.items]);
    } catch {
      this.categories.set([]);
    }
  }

  /** Rough USD fallback price from the supplier face value; the live price comes from supplier cost + margin. */
  private async estimateUsdPrice(item: SupplierCatalogItemDto): Promise<number> {
    if (item.minFaceValue === null || item.minFaceValue <= 0) {
      return 0;
    }

    if (item.currency === 'USD') {
      return item.minFaceValue;
    }

    try {
      this.usdRates ??= (await firstValueFrom(this.api.get<ExchangeRatesResponse>(LOCALIZATION_API.exchangeRates))).rates;
      const rate = this.usdRates[item.currency];
      return rate && rate > 0 ? Math.round((item.minFaceValue / rate) * 100) / 100 : 0;
    } catch {
      return 0;
    }
  }

  private buildSku(name: string): string {
    const slug = name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return `${slug || 'SUP'}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  protected retryLoad(): void {
    void this.runSearch(this.page(), false);
  }

  protected loadMore(): void {
    void this.runSearch(this.page() + 1, true);
  }

  private async runSearch(page: number, append: boolean): Promise<void> {
    const token = ++this.searchToken;
    append ? this.loadingMore.set(true) : this.loading.set(true);
    this.error.set(false);
    this.unsupportedMessage.set(null);

    try {
      const result = await this.facade.searchCatalog(this.supplierId(), this.searchTerm(), page, PAGE_SIZE);
      if (token !== this.searchToken) {
        return;
      }

      this.loading.set(false);
      this.loadingMore.set(false);

      if (!result.isSuccess) {
        if (!append) {
          this.items.set([]);
        }
        this.hasMore.set(false);
        this.unsupportedMessage.set(result.message ?? null);
        return;
      }

      this.items.set(append ? [...this.items(), ...result.items] : result.items);
      this.page.set(page);
      this.hasMore.set(result.items.length === PAGE_SIZE);
    } catch {
      if (token !== this.searchToken) {
        return;
      }

      this.loading.set(false);
      this.loadingMore.set(false);
      this.error.set(true);
      if (!append) {
        this.items.set([]);
      }
      this.hasMore.set(false);
    }
  }
}
