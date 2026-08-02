import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { downloadBlob } from '../../../admin/reports/utils/reports-download.util';
import { CatalogImportExportApiService, CatalogPackageJobListParams } from './catalog-import-export-api.service';
import {
  CatalogDuplicateStrategy,
  CatalogExportRequest,
  CatalogImportCorrection,
  CatalogImportEntityType,
  CatalogImportLookupItem,
  CatalogImportLookups,
  CatalogImportRowOverride,
  CatalogImportValidationReport,
  CatalogPackageJobDto,
  CatalogPackageOptions,
  CatalogSkuStrategy,
  ImportWizardStep,
  PagedResult,
  defaultCatalogPackageOptions,
} from '../models/import-export.model';

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = new Set(['Completed', 'Failed']);

interface ExportState {
  readonly status: 'idle' | 'running' | 'done' | 'error';
  readonly job: CatalogPackageJobDto | null;
  readonly error: string | null;
}

interface ImportState {
  readonly step: ImportWizardStep;
  readonly entityType: CatalogImportEntityType;
  readonly uploadJob: CatalogPackageJobDto | null;
  readonly validation: CatalogImportValidationReport | null;
  readonly strategy: CatalogDuplicateStrategy;
  readonly skuStrategy: CatalogSkuStrategy;
  readonly options: CatalogPackageOptions;
  readonly packagePassword: string;
  readonly corrections: readonly CatalogImportCorrection[];
  readonly rowOverrides: readonly CatalogImportRowOverride[];
  readonly executeJob: CatalogPackageJobDto | null;
  readonly loading: boolean;
  readonly error: string | null;
}

/** Signal-based facade owning both the Export panel's and the Import wizard's state — same idiom as CartFacade/ThemeService. */
@Injectable()
export class CatalogImportExportFacade implements OnDestroy {
  private readonly api = inject(CatalogImportExportApiService);

  private readonly exportStateSignal = signal<ExportState>({ status: 'idle', job: null, error: null });
  private readonly importStateSignal = signal<ImportState>({
    step: 'upload',
    entityType: 'FullPackage',
    uploadJob: null,
    validation: null,
    strategy: 'Skip',
    skuStrategy: 'UseImportedSku',
    options: defaultCatalogPackageOptions(),
    packagePassword: '',
    corrections: [],
    rowOverrides: [],
    executeJob: null,
    loading: false,
    error: null,
  });

  private readonly jobListStateSignal = signal<PagedResult<CatalogPackageJobDto> | null>(null);
  private readonly jobListLoadingSignal = signal(false);
  private readonly jobListErrorSignal = signal<string | null>(null);
  private readonly selectedJobDetailSignal = signal<CatalogPackageJobDto | null>(null);
  private readonly lookupsSignal = signal<CatalogImportLookups | null>(null);

  readonly exportState = this.exportStateSignal.asReadonly();
  readonly importState = this.importStateSignal.asReadonly();
  /** Categories/Collections/status/currency values backing the wizard's inline correction pickers — loaded once, reused across an import session. */
  readonly lookups = this.lookupsSignal.asReadonly();
  readonly canDownloadExport = computed(
    () => this.exportStateSignal().status === 'done' && !!this.exportStateSignal().job,
  );
  readonly jobList = this.jobListStateSignal.asReadonly();
  readonly jobListLoading = this.jobListLoadingSignal.asReadonly();
  readonly jobListError = this.jobListErrorSignal.asReadonly();
  /** Out-of-band detail for a job the caller has selected but that's no longer in the current page/filter. */
  readonly selectedJobDetail = this.selectedJobDetailSignal.asReadonly();

  private exportPollHandle: ReturnType<typeof setInterval> | null = null;
  private importPollHandle: ReturnType<typeof setInterval> | null = null;
  private selectedJobPollHandle: ReturnType<typeof setInterval> | null = null;
  private selectedJobPollTargetId: string | null = null;

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ---------- Export ----------

  async startExport(request: CatalogExportRequest): Promise<void> {
    this.exportStateSignal.set({ status: 'running', job: null, error: null });

    try {
      const jobId = await firstValueFrom(this.api.exportCatalog(request));
      this.pollExportJob(jobId);
    } catch {
      this.exportStateSignal.set({ status: 'error', job: null, error: 'Unable to start the export.' });
    }
  }

  async downloadExport(): Promise<void> {
    await this.downloadJobFile(this.exportStateSignal().job, 'catalog-export');
  }

  resetExport(): void {
    this.stopPolling('export');
    this.exportStateSignal.set({ status: 'idle', job: null, error: null });
  }

  private pollExportJob(jobId: string): void {
    this.stopPolling('export');
    const tick = async () => {
      try {
        const job = await firstValueFrom(this.api.getJob(jobId));
        if (TERMINAL_STATUSES.has(job.status)) {
          this.stopPolling('export');
          this.exportStateSignal.set({
            status: job.status === 'Completed' ? 'done' : 'error',
            job,
            error: job.status === 'Failed' ? job.errorMessage : null,
          });
          return;
        }

        this.exportStateSignal.update((state) => ({ ...state, job }));
      } catch {
        this.stopPolling('export');
        this.exportStateSignal.set({ status: 'error', job: null, error: 'Lost connection while exporting.' });
      }
    };

    void tick();
    this.exportPollHandle = setInterval(() => void tick(), POLL_INTERVAL_MS);
  }

  // ---------- Import wizard ----------

  resetImportWizard(): void {
    this.stopPolling('import');
    this.importStateSignal.set({
      step: 'upload',
      entityType: 'FullPackage',
      uploadJob: null,
      validation: null,
      strategy: 'Skip',
      skuStrategy: 'UseImportedSku',
      options: defaultCatalogPackageOptions(),
      packagePassword: '',
      corrections: [],
      rowOverrides: [],
      executeJob: null,
      loading: false,
      error: null,
    });
  }

  setEntityType(entityType: CatalogImportEntityType): void {
    this.importStateSignal.update((state) => ({ ...state, entityType }));
  }

  setStrategy(strategy: CatalogDuplicateStrategy): void {
    this.importStateSignal.update((state) => ({ ...state, strategy }));
  }

  setOptions(options: CatalogPackageOptions): void {
    this.importStateSignal.update((state) => ({ ...state, options }));
  }

  setPackagePassword(password: string): void {
    this.importStateSignal.update((state) => ({ ...state, packagePassword: password }));
  }

  async uploadAndValidate(file: File): Promise<void> {
    this.importStateSignal.update((state) => ({ ...state, loading: true, error: null }));

    try {
      const entityType = this.importStateSignal().entityType;
      const uploadJob = await firstValueFrom(this.api.uploadImport(file, entityType));
      this.importStateSignal.update((state) => ({ ...state, uploadJob, step: 'validate' }));
      await this.runValidation();
    } catch (error) {
      this.importStateSignal.update((state) => ({
        ...state,
        loading: false,
        error: extractErrorDetail(error, 'Unable to upload this file.'),
      }));
    }
  }

  async runValidation(): Promise<void> {
    const uploadJob = this.importStateSignal().uploadJob;
    if (!uploadJob) {
      return;
    }

    this.importStateSignal.update((state) => ({ ...state, loading: true, error: null }));

    try {
      const { packagePassword, skuStrategy, corrections } = this.importStateSignal();
      const validation = await firstValueFrom(
        this.api.validateImport(uploadJob.id, packagePassword || undefined, skuStrategy, corrections),
      );
      this.importStateSignal.update((state) => ({ ...state, validation, loading: false }));
    } catch (error) {
      this.importStateSignal.update((state) => ({
        ...state,
        loading: false,
        error: extractErrorDetail(error, 'Unable to validate this file.'),
      }));
    }
  }

  goToStep(step: ImportWizardStep): void {
    this.importStateSignal.update((state) => ({ ...state, step }));
  }

  setSkuStrategy(skuStrategy: CatalogSkuStrategy): void {
    this.importStateSignal.update((state) => ({ ...state, skuStrategy }));
  }

  async loadLookups(): Promise<void> {
    if (this.lookupsSignal()) {
      return;
    }

    try {
      this.lookupsSignal.set(await firstValueFrom(this.api.getImportLookups()));
    } catch {
      // Non-fatal — the wizard still works without dropdown-assisted corrections, just with free text.
    }
  }

  /** Injects a just-created category into the in-session lookup cache (datalist suggestions + "already known" checks) so later rows referencing the same name resolve without another round trip. No-op if a category with that slug is already cached. */
  addCategoryLookup(item: CatalogImportLookupItem): void {
    const current = this.lookupsSignal();
    if (!current || current.categories.some((c) => c.value.toLowerCase() === item.value.toLowerCase())) {
      return;
    }

    this.lookupsSignal.update((state) => state && { ...state, categories: [...state.categories, item] });
  }

  /** "Apply to all N occurrences" — appends the correction and revalidates against the already-uploaded file, no re-upload needed. `createNew` additionally creates a category/collection named `toValue` (Category/Collection columns only — see `CatalogImportCorrectionApplier`). */
  async applyCorrection(
    entityType: string,
    column: string,
    fromValue: string,
    toValue: string,
    createNew = false,
  ): Promise<void> {
    this.importStateSignal.update((state) => ({
      ...state,
      corrections: [...state.corrections, { entityType, column, fromValue, toValue, createNew }],
    }));
    await this.runValidation();
  }

  /** Duplicate-SKU row decision (Update Existing / Generate New / Skip) — only consumed at Execute, so no revalidate call needed. */
  applyRowOverride(rowNumber: number, entityType: string, strategy: CatalogDuplicateStrategy): void {
    this.importStateSignal.update((state) => ({
      ...state,
      rowOverrides: [
        ...state.rowOverrides.filter((o) => !(o.rowNumber === rowNumber && o.entityType === entityType)),
        { rowNumber, entityType, strategy },
      ],
    }));
  }

  async executeImport(): Promise<void> {
    const { uploadJob, strategy, options, packagePassword, skuStrategy, corrections, rowOverrides } =
      this.importStateSignal();
    if (!uploadJob) {
      return;
    }

    this.importStateSignal.update((state) => ({ ...state, step: 'execute', loading: true, error: null }));

    try {
      const jobId = await firstValueFrom(
        this.api.executeImport(
          uploadJob.id,
          strategy,
          options,
          packagePassword || undefined,
          skuStrategy,
          corrections,
          rowOverrides,
        ),
      );
      this.pollImportJob(jobId);
    } catch (error) {
      this.importStateSignal.update((state) => ({
        ...state,
        loading: false,
        error: extractErrorDetail(error, 'Unable to start the import.'),
      }));
    }
  }

  async downloadImportReport(): Promise<void> {
    await this.downloadJobFile(this.importStateSignal().executeJob);
  }

  private pollImportJob(jobId: string): void {
    this.stopPolling('import');
    const tick = async () => {
      try {
        const job = await firstValueFrom(this.api.getJob(jobId));
        this.importStateSignal.update((state) => ({ ...state, executeJob: job }));

        if (TERMINAL_STATUSES.has(job.status)) {
          this.stopPolling('import');
          this.importStateSignal.update((state) => ({ ...state, loading: false, step: 'summary' }));
        }
      } catch {
        this.stopPolling('import');
        this.importStateSignal.update((state) => ({
          ...state,
          loading: false,
          error: 'Lost connection while importing.',
        }));
      }
    };

    void tick();
    this.importPollHandle = setInterval(() => void tick(), POLL_INTERVAL_MS);
  }

  // ---------- Jobs list ----------

  async loadJobList(params: CatalogPackageJobListParams): Promise<void> {
    this.jobListLoadingSignal.set(true);
    this.jobListErrorSignal.set(null);

    try {
      this.jobListStateSignal.set(await firstValueFrom(this.api.listJobs(params)));
    } catch {
      this.jobListErrorSignal.set('Unable to load import/export jobs.');
    } finally {
      this.jobListLoadingSignal.set(false);
    }
  }

  async downloadJob(job: CatalogPackageJobDto): Promise<void> {
    await this.downloadJobFile(job);
  }

  private async downloadJobFile(
    job: CatalogPackageJobDto | null | undefined,
    fallbackFileName?: string,
  ): Promise<void> {
    if (!job || (!job.resultFileName && !fallbackFileName)) {
      return;
    }

    const blob = await firstValueFrom(this.api.downloadJobResult(job.id));
    downloadBlob(blob, job.resultFileName ?? fallbackFileName!);
  }

  /** Fetches and polls a single job by id — used when a selected job falls out of the current page/filter. No-ops if already watching this id. */
  watchJobDetail(jobId: string): void {
    if (this.selectedJobPollTargetId === jobId && this.selectedJobPollHandle) {
      return;
    }

    this.stopPolling('selectedJob');
    this.selectedJobPollTargetId = jobId;

    const tick = async () => {
      try {
        const job = await firstValueFrom(this.api.getJob(jobId));
        this.selectedJobDetailSignal.set(job);

        if (TERMINAL_STATUSES.has(job.status)) {
          this.stopPolling('selectedJob');
        }
      } catch {
        this.stopPolling('selectedJob');
      }
    };

    void tick();
    this.selectedJobPollHandle = setInterval(() => void tick(), POLL_INTERVAL_MS);
  }

  stopWatchingJobDetail(): void {
    this.stopPolling('selectedJob');
  }

  private stopPolling(which?: 'export' | 'import' | 'selectedJob'): void {
    if ((!which || which === 'export') && this.exportPollHandle) {
      clearInterval(this.exportPollHandle);
      this.exportPollHandle = null;
    }

    if ((!which || which === 'import') && this.importPollHandle) {
      clearInterval(this.importPollHandle);
      this.importPollHandle = null;
    }

    if ((!which || which === 'selectedJob') && this.selectedJobPollHandle) {
      clearInterval(this.selectedJobPollHandle);
      this.selectedJobPollHandle = null;
      this.selectedJobPollTargetId = null;
    }
  }
}

export function extractErrorDetail(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'error' in error) {
    const httpError = (error as { error?: { detail?: string } }).error;
    if (httpError?.detail) {
      return httpError.detail;
    }
  }

  return fallback;
}
