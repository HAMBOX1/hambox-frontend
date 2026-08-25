import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminBulkBarComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import {
  SupplierCatalogSearchDrawerComponent,
  SupplierCatalogSearchDrawerTarget,
} from '../../components/supplier-catalog-search-drawer/supplier-catalog-search-drawer.component';
import {
  CreateSupplierMappingRequest,
  SupplierMappingCandidateDto,
  SupplierMappingSuggestionDto,
} from '../../models/supplier.model';
import { SuppliersManagementFacade } from '../../services/suppliers-management.facade';

@Component({
  selector: 'app-map-products-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    SelectModule,
    TableModule,
    ToastModule,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminSearchBarComponent,
    AdminStatCardComponent,
    AdminStatGridComponent,
    AdminStatusBadgeComponent,
    AdminBulkBarComponent,
    SupplierCatalogSearchDrawerComponent,
  ],
  providers: [SuppliersManagementFacade, MessageService],
  templateUrl: './map-products-page.component.html',
  styleUrl: './map-products-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapProductsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  protected readonly facade = inject(SuppliersManagementFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly supplierId = signal('');
  protected readonly supplierName = computed(() => this.facade.detail()?.name ?? '');

  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      { label: this.translate.instant('ADMIN.SUPPLIERS.LIST.TITLE'), route: '/admin/suppliers' },
      { label: this.supplierName(), route: `/admin/suppliers/${this.supplierId()}` },
      { label: this.translate.instant('ADMIN.SUPPLIERS.MAP_PRODUCTS.TITLE') },
    ),
  );

  protected readonly candidates = computed(() => this.facade.candidates()?.items ?? []);
  protected readonly totalCount = computed(() => this.facade.candidates()?.totalCount ?? 0);
  protected readonly loading = this.facade.candidatesLoading;
  protected readonly error = this.facade.candidatesError;
  protected readonly summary = this.facade.candidatesSummary;
  protected readonly suggestions = this.facade.suggestionsByVariantId;
  protected readonly suggesting = this.facade.suggesting;
  protected readonly bulkMapping = this.facade.bulkMapping;

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly page = signal(1);
  protected readonly pageSize = 20;

  protected readonly selected = signal<readonly SupplierMappingCandidateDto[]>([]);
  protected readonly drawerTarget = signal<SupplierCatalogSearchDrawerTarget | null>(null);

  protected readonly statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Mapped', value: 'mapped' },
    { label: 'Needs mapping', value: 'unmapped' },
  ];

  /** How many selected rows currently have a resolved, real suggestion — what the bulk "Confirm" action
   * can actually act on. A row with no suggestion yet (or a "None" tier) is simply skipped, never
   * silently mapped to nothing. */
  protected readonly confirmableSelection = computed(() =>
    this.selected().filter((candidate) => !!this.suggestionFor(candidate)?.bestMatch),
  );

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(debounceTime(300)).subscribe(() => {
      this.page.set(1);
      void this.load();
    });
  }

  ngOnInit(): void {
    const supplierId = this.route.snapshot.paramMap.get('id');
    if (!supplierId) {
      return;
    }

    this.supplierId.set(supplierId);
    void this.facade.loadDetail(supplierId);
    void this.facade.loadMappingCandidatesSummary(supplierId);
    void this.load();
  }

  protected async load(): Promise<void> {
    await this.facade.loadMappingCandidates(this.supplierId(), this.searchTerm(), this.statusFilter(), this.page(), this.pageSize);
  }

  protected onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.search$.next(term);
  }

  protected onStatusChange(status: string): void {
    this.statusFilter.set(status);
    this.page.set(1);
    void this.load();
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize;
    this.page.set(Math.floor(first / rows) + 1);
    void this.load();
  }

  protected onSelectionChange(selection: readonly SupplierMappingCandidateDto[]): void {
    this.selected.set(selection);
  }

  protected clearSelection(): void {
    this.selected.set([]);
  }

  protected suggestionFor(candidate: SupplierMappingCandidateDto): SupplierMappingSuggestionDto | undefined {
    return this.suggestions().get(candidate.variantId);
  }

  protected statusTone(candidate: SupplierMappingCandidateDto): 'success' | 'info' | 'warning' | 'danger' {
    if (candidate.existingMappingId) {
      return candidate.availabilityState === 'Unavailable' ? 'danger' : 'success';
    }

    const tier = this.suggestionFor(candidate)?.confidenceTier;
    if (tier === 'High' || tier === 'Medium') {
      return 'info';
    }

    return 'warning';
  }

  protected statusLabel(candidate: SupplierMappingCandidateDto): string {
    if (candidate.existingMappingId) {
      return candidate.availabilityState === 'Unavailable'
        ? 'ADMIN.SUPPLIERS.MAP_PRODUCTS.STATUS.UNAVAILABLE'
        : 'ADMIN.SUPPLIERS.MAP_PRODUCTS.STATUS.MAPPED';
    }

    const tier = this.suggestionFor(candidate)?.confidenceTier;
    if (tier === 'High' || tier === 'Medium') {
      return 'ADMIN.SUPPLIERS.MAP_PRODUCTS.STATUS.SUGGESTED';
    }

    return 'ADMIN.SUPPLIERS.MAP_PRODUCTS.STATUS.NEEDS_MAPPING';
  }

  /** Live, on-demand matching for every currently-unmapped row on this page — never the whole catalog
   * at once (Bamboo has no bulk catalog export; see the suggest endpoint's own remarks). */
  protected async findMatches(): Promise<void> {
    const unmapped = this.candidates().filter((c) => !c.existingMappingId);
    if (unmapped.length === 0) {
      return;
    }

    await this.facade.suggestMappings(
      this.supplierId(),
      unmapped.map((c) => ({ productId: c.productId, variantId: c.variantId })),
    );
  }

  protected async confirmHighConfidence(candidate: SupplierMappingCandidateDto): Promise<void> {
    const bestMatch = this.suggestionFor(candidate)?.bestMatch;
    if (!bestMatch) {
      return;
    }

    const success = await this.facade.createMapping(this.supplierId(), this.toRequest(candidate, bestMatch));
    if (success) {
      await this.afterMutation('ADMIN.SUPPLIERS.MESSAGES.MAPPING_SAVED');
    } else {
      this.toastError();
    }
  }

  protected openDrawer(candidate: SupplierMappingCandidateDto, seedWithSuggestion: boolean): void {
    const bestMatch = seedWithSuggestion ? this.suggestionFor(candidate)?.bestMatch ?? null : null;
    this.drawerTarget.set({
      supplierId: this.supplierId(),
      supplierName: this.supplierName(),
      productId: candidate.productId,
      productName: candidate.productName,
      variantId: candidate.variantId,
      variantLabel: candidate.variantDisplayName,
      suggestedMatch: bestMatch,
    });
  }

  protected onDrawerClosed(): void {
    this.drawerTarget.set(null);
  }

  protected async onMappingCreated(): Promise<void> {
    await this.afterMutation('ADMIN.SUPPLIERS.MESSAGES.MAPPING_SAVED');
  }

  /** The "Confirm N Mappings" bulk action — every selected row with a resolved suggestion, in one
   * request. A selected row with no suggestion (or "None") is silently skipped, not force-mapped. */
  protected async confirmBulk(): Promise<void> {
    const requests: CreateSupplierMappingRequest[] = this.confirmableSelection()
      .map((candidate) => {
        const bestMatch = this.suggestionFor(candidate)!.bestMatch!;
        return this.toRequest(candidate, bestMatch);
      });

    if (requests.length === 0) {
      return;
    }

    const attempted = requests.length;
    const result = await this.facade.bulkCreateMappings(this.supplierId(), requests);
    this.clearSelection();

    if (!result) {
      this.toastError();
      return;
    }

    this.messageService.add({
      severity: result.failures.length === 0 ? 'success' : 'warn',
      summary: this.translate.instant('ADMIN.SUPPLIERS.MAP_PRODUCTS.BULK_RESULT', {
        created: result.createdMappingIds.length,
        total: attempted,
      }),
      life: 5000,
    });

    await Promise.all([this.load(), this.facade.loadMappingCandidatesSummary(this.supplierId())]);
  }

  private toRequest(
    candidate: SupplierMappingCandidateDto,
    bestMatch: NonNullable<SupplierMappingSuggestionDto['bestMatch']>,
  ): CreateSupplierMappingRequest {
    return {
      internalProductId: candidate.productId,
      internalProductVariantId: candidate.variantId,
      externalProductId: bestMatch.externalProductId,
      externalSku: null,
      externalName: bestMatch.name,
      buyingPrice: bestMatch.minFaceValue ?? 0,
      currency: bestMatch.currency,
      priority: 100,
    };
  }

  private async afterMutation(messageKey: string): Promise<void> {
    this.messageService.add({ severity: 'success', summary: this.translate.instant(messageKey), life: 4000 });
    await Promise.all([this.load(), this.facade.loadMappingCandidatesSummary(this.supplierId())]);
  }

  private toastError(): void {
    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.ACTION_FAILED'),
      detail: this.facade.candidatesError() ?? '',
      life: 5000,
    });
  }
}
