import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminPageHeaderComponent,
  AdminProgressBarComponent,
  AdminSearchBarComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { CatalogPackageJobDto } from '../../models/import-export.model';
import { CatalogImportExportFacade } from '../../services/catalog-import-export.facade';

const ACTIVE_STATUSES = new Set(['Uploaded', 'Queued', 'Processing']);
const AUTO_REFRESH_MS = 8_000;
const SEARCH_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-import-export-jobs-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    DrawerModule,
    SelectModule,
    TableModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminStatusBadgeComponent,
    AdminIconButtonComponent,
    AdminProgressBarComponent,
  ],
  providers: [CatalogImportExportFacade],
  templateUrl: './import-export-jobs-page.component.html',
  styleUrl: './import-export-jobs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportExportJobsPageComponent implements OnInit, OnDestroy {
  protected readonly facade = inject(CatalogImportExportFacade);
  private readonly translate = inject(TranslateService);
  private refreshHandle: ReturnType<typeof setInterval> | null = null;
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Products', route: '/admin/products' },
    { label: 'Import/Export Jobs' },
  );

  protected readonly directionOptions = [
    { label: 'All types', value: undefined },
    { label: 'Import', value: 'Import' },
    { label: 'Export', value: 'Export' },
  ];
  protected readonly statusOptions = [
    { label: 'All statuses', value: undefined },
    { label: 'Uploaded', value: 'Uploaded' },
    { label: 'Queued', value: 'Queued' },
    { label: 'Processing', value: 'Processing' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Failed', value: 'Failed' },
  ];

  protected readonly searchTerm = signal('');
  protected readonly directionFilter = signal<string | undefined>(undefined);
  protected readonly statusFilter = signal<string | undefined>(undefined);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  /** PrimeNG sort convention: 1 = ascending, -1 = descending. Only CreatedOnUtc is sortable server-side. */
  protected readonly sortOrder = signal(-1);

  protected readonly result = this.facade.jobList;
  protected readonly loading = this.facade.jobListLoading;
  protected readonly error = this.facade.jobListError;

  protected readonly rows = computed(() => this.result()?.items ?? []);
  protected readonly totalCount = computed(() => this.result()?.totalCount ?? 0);
  protected readonly tableFirst = computed(() => (this.page() - 1) * this.pageSize());
  protected readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || !!this.directionFilter() || !!this.statusFilter(),
  );
  protected readonly hasActiveJobs = computed(() => this.rows().some((j) => ACTIVE_STATUSES.has(j.status)));

  private readonly selectedJobId = signal<string | null>(null);
  private readonly selectedJobFallback = signal<CatalogPackageJobDto | null>(null);
  protected readonly detailsVisible = signal(false);
  private readonly selectedJobInCurrentView = computed(() => {
    const id = this.selectedJobId();
    return id ? (this.rows().find((j) => j.id === id) ?? null) : null;
  });
  /**
   * Prefers the live row from the current page/filter (already kept fresh by auto-refresh). If the
   * job has fallen out of the current view, falls back to the facade's out-of-band single-job poll
   * (started/stopped by the effect below) instead of freezing on a stale snapshot.
   */
  protected readonly selectedJob = computed(() => {
    const id = this.selectedJobId();
    if (!id) {
      return null;
    }
    const liveRow = this.selectedJobInCurrentView();
    if (liveRow) {
      return liveRow;
    }
    const detail = this.facade.selectedJobDetail();
    return detail && detail.id === id ? detail : this.selectedJobFallback();
  });

  constructor() {
    // Keeps the drawer synchronized once a selected job scrolls/filters out of the current page:
    // switches to polling it directly by id, and stops as soon as it's visible again, terminal, or the drawer closes.
    effect(() => {
      const id = this.selectedJobId();
      const visible = this.detailsVisible();

      if (!id || !visible || this.selectedJobInCurrentView()) {
        this.facade.stopWatchingJobDetail();
        return;
      }

      this.facade.watchJobDetail(id);
    });
  }

  ngOnInit(): void {
    this.reload();
    this.refreshHandle = setInterval(() => {
      if (this.hasActiveJobs()) {
        this.reload(false);
      }
    }, AUTO_REFRESH_MS);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
    }
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }
  }

  protected onSearchChange(term: string): void {
    this.searchTerm.set(term);
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }
    this.searchDebounceHandle = setTimeout(() => {
      this.page.set(1);
      this.reload();
    }, SEARCH_DEBOUNCE_MS);
  }

  protected onDirectionChange(value: string | undefined): void {
    this.directionFilter.set(value);
    this.page.set(1);
    this.reload();
  }

  protected onStatusChange(value: string | undefined): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.reload();
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize();
    const first = event.first ?? 0;
    this.pageSize.set(rows);
    this.page.set(Math.floor(first / rows) + 1);
    if (event.sortOrder != null) {
      this.sortOrder.set(event.sortOrder);
    }
    this.reload();
  }

  protected refresh(): void {
    this.reload();
  }

  protected retryLoad(): void {
    this.reload();
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Failed':
        return 'danger';
      case 'Queued':
      case 'Uploaded':
        return 'warning';
      case 'Processing':
        return 'info';
      case 'Completed':
        return 'success';
      default:
        return 'neutral';
    }
  }

  protected durationSeconds(job: CatalogPackageJobDto): number | null {
    if (job.status !== 'Completed' && job.status !== 'Failed') {
      return null;
    }
    if (!job.modifiedOnUtc) {
      return null;
    }
    return (new Date(job.modifiedOnUtc).getTime() - new Date(job.createdOnUtc).getTime()) / 1000;
  }

  protected canDownload(job: CatalogPackageJobDto): boolean {
    return job.status === 'Completed' && !!job.resultFileName;
  }

  protected openDetails(job: CatalogPackageJobDto): void {
    this.selectedJobId.set(job.id);
    this.selectedJobFallback.set(job);
    this.detailsVisible.set(true);
  }

  protected onDetailsVisibleChange(visible: boolean): void {
    this.detailsVisible.set(visible);
  }

  protected detailsLabel(job: CatalogPackageJobDto): string {
    return this.translate.instant('ADMIN.CATALOG_IMPORT_EXPORT_JOBS.ACTIONS.DETAILS_FOR', {
      fileName: job.fileName || job.resultFileName || job.direction,
    });
  }

  protected downloadLabel(job: CatalogPackageJobDto): string {
    return this.translate.instant('ADMIN.CATALOG_IMPORT_EXPORT_JOBS.ACTIONS.DOWNLOAD_FOR', {
      fileName: job.resultFileName || job.fileName || job.direction,
    });
  }

  protected async download(job: CatalogPackageJobDto): Promise<void> {
    await this.facade.downloadJob(job);
  }

  private reload(showLoading = true): void {
    if (!showLoading && this.loading()) {
      return;
    }
    void this.facade.loadJobList({
      direction: this.directionFilter(),
      status: this.statusFilter(),
      search: this.searchTerm() || undefined,
      page: this.page(),
      pageSize: this.pageSize(),
      sort: this.sortOrder() === 1 ? 'created_asc' : 'created_desc',
    });
  }
}
