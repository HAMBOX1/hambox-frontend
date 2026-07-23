import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { downloadBlob } from '../../../admin/reports/utils/reports-download.util';
import { CatalogImportExportApiService } from './catalog-import-export-api.service';
import {
  CatalogDuplicateStrategy,
  CatalogExportRequest,
  CatalogImportEntityType,
  CatalogImportValidationReport,
  CatalogPackageJobDto,
  CatalogPackageOptions,
  ImportWizardStep,
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
  readonly options: CatalogPackageOptions;
  readonly packagePassword: string;
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
    options: defaultCatalogPackageOptions(),
    packagePassword: '',
    executeJob: null,
    loading: false,
    error: null,
  });

  readonly exportState = this.exportStateSignal.asReadonly();
  readonly importState = this.importStateSignal.asReadonly();
  readonly canDownloadExport = computed(
    () => this.exportStateSignal().status === 'done' && !!this.exportStateSignal().job,
  );

  private exportPollHandle: ReturnType<typeof setInterval> | null = null;
  private importPollHandle: ReturnType<typeof setInterval> | null = null;

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
    const job = this.exportStateSignal().job;
    if (!job) {
      return;
    }

    const blob = await firstValueFrom(this.api.downloadJobResult(job.id));
    downloadBlob(blob, job.resultFileName ?? 'catalog-export');
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
      options: defaultCatalogPackageOptions(),
      packagePassword: '',
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
      const password = this.importStateSignal().packagePassword;
      const validation = await firstValueFrom(this.api.validateImport(uploadJob.id, password || undefined));
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

  async executeImport(): Promise<void> {
    const { uploadJob, strategy, options, packagePassword } = this.importStateSignal();
    if (!uploadJob) {
      return;
    }

    this.importStateSignal.update((state) => ({ ...state, step: 'execute', loading: true, error: null }));

    try {
      const jobId = await firstValueFrom(
        this.api.executeImport(uploadJob.id, strategy, options, packagePassword || undefined),
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
    const job = this.importStateSignal().executeJob;
    if (!job?.resultFileName) {
      return;
    }

    const blob = await firstValueFrom(this.api.downloadJobResult(job.id));
    downloadBlob(blob, job.resultFileName);
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

  private stopPolling(which?: 'export' | 'import'): void {
    if ((!which || which === 'export') && this.exportPollHandle) {
      clearInterval(this.exportPollHandle);
      this.exportPollHandle = null;
    }

    if ((!which || which === 'import') && this.importPollHandle) {
      clearInterval(this.importPollHandle);
      this.importPollHandle = null;
    }
  }
}

function extractErrorDetail(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'error' in error) {
    const httpError = (error as { error?: { detail?: string } }).error;
    if (httpError?.detail) {
      return httpError.detail;
    }
  }

  return fallback;
}
