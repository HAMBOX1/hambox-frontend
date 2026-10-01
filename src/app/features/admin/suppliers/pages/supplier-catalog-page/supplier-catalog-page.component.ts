import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

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
    DecimalPipe,
    TranslatePipe,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminSearchBarComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [SuppliersManagementFacade],
  templateUrl: './supplier-catalog-page.component.html',
  styleUrl: './supplier-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierCatalogPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
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

  private searchToken = 0;

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
