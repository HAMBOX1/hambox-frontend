import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

import {
  AdminConfirmDialogComponent,
  AdminFileDropzoneComponent,
  AdminPageHeaderComponent,
  AdminProgressBarComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminStepperComponent,
  AdminStepperStep,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { CategoryCreateFormComponent } from '../../../components/category-create-form/category-create-form.component';
import { CategoryOption, CreateCategoryRequest } from '../../../models/category.model';
import { CategoryApiService, createCategoryWithHierarchy } from '../../../services/category-api.service';
import {
  CatalogDuplicateStrategy,
  CatalogImportEntityType,
  CatalogImportFieldIssue,
  CatalogImportRowResult,
  CatalogImportRowStatus,
  IMPORT_WIZARD_STEPS,
  ImportWizardStep,
} from '../../models/import-export.model';
import { CatalogImportExportApiService } from '../../services/catalog-import-export-api.service';
import { CatalogImportExportFacade, extractErrorDetail } from '../../services/catalog-import-export.facade';

interface CorrectionGroup {
  readonly issueType: string;
  readonly entityType: string;
  readonly column: string;
  readonly value: string;
  readonly count: number;
}

const STEP_LABELS: readonly AdminStepperStep[] = [
  { label: 'Upload', icon: 'pi-upload' },
  { label: 'Validate', icon: 'pi-search' },
  { label: 'Strategy', icon: 'pi-sliders-h' },
  { label: 'Execute', icon: 'pi-cog' },
  { label: 'Summary', icon: 'pi-check-circle' },
];

// Inventory (variants) and Digital codes are deliberately not offered here — variants are
// generated after a Products import via the existing "Generate Variants" action in the product
// editor, and codes are added per-variant in the catalog admin UI, not bulk-imported.
const ENTITY_TYPE_OPTIONS: readonly { label: string; value: CatalogImportEntityType; hint?: string }[] = [
  { label: 'Full catalog package (.hambox)', value: 'FullPackage' },
  { label: 'Products', value: 'Products' },
  { label: 'Categories', value: 'Categories' },
  { label: 'Internal Categories', value: 'Collections', hint: 'Import/export column: Collections' },
];

@Component({
  selector: 'app-catalog-import-wizard-page',
  standalone: true,
  imports: [
    FormsModule,
    DialogModule,
    PasswordModule,
    RadioButtonModule,
    TableModule,
    ToastModule,
    AdminConfirmDialogComponent,
    AdminFileDropzoneComponent,
    AdminPageHeaderComponent,
    AdminProgressBarComponent,
    AdminSectionCardComponent,
    AdminStatusBadgeComponent,
    AdminStepperComponent,
    CategoryCreateFormComponent,
  ],
  providers: [CatalogImportExportFacade, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast />
    <app-admin-page-header
      title="Import Catalog"
      subtitle="Upload a .hambox package or a Products/Categories/Collections/Inventory/Codes template. Nothing is written until you review and confirm."
      [breadcrumbs]="breadcrumbs"
    />

    <app-admin-section-card [padded]="true">
      <app-admin-stepper [steps]="stepLabels" [activeIndex]="activeIndex()" />
    </app-admin-section-card>

    @switch (state().step) {
      @case ('upload') {
        <app-admin-section-card title="1. Upload" description="Choose what you're uploading, then pick a file.">
          <div class="wizard__entity-picker">
            @for (option of entityTypeOptions; track option.value) {
              <div class="wizard__radio-group">
                <p-radiobutton
                  name="entityType"
                  [inputId]="'entity-' + option.value"
                  [value]="option.value"
                  [ngModel]="state().entityType"
                  (ngModelChange)="facade.setEntityType($event)"
                />
                <label [for]="'entity-' + option.value">
                  {{ option.label }}
                  @if (option.hint) {
                    <span class="wizard__entity-hint">{{ option.hint }}</span>
                  }
                </label>
              </div>
            }
          </div>

          @if (state().entityType !== 'FullPackage') {
            <button type="button" class="wizard__link-button" (click)="downloadTemplate()">
              Download {{ entityTypeDisplayLabel(state().entityType) }} template
            </button>
          }

          <div class="wizard__password-row">
            <p-password
              [ngModel]="state().packagePassword"
              (ngModelChange)="facade.setPackagePassword($event)"
              [feedback]="false"
              [toggleMask]="true"
              placeholder="Package password (only if this .hambox file is encrypted)"
            />
          </div>

          <app-admin-file-dropzone
            [accept]="acceptFor(state().entityType)"
            hint="Accepts .hambox, .xlsx, .xlsm, or .csv"
            [disabled]="state().loading"
            (fileSelected)="onFileSelected($event)"
          />

          @if (state().loading) {
            <app-admin-progress-bar [indeterminate]="true" label="Uploading and validating…" />
          }
        </app-admin-section-card>
      }

      @case ('validate') {
        <app-admin-section-card title="2. Validate" description="Review what this import will do before choosing a strategy.">
          @if (state().validation; as report) {
            <div class="wizard__summary-counts">
              <span class="wizard__count wizard__count--new">{{ report.newCount }} new</span>
              <span class="wizard__count wizard__count--updated">{{ report.updatedCount }} updated</span>
              <span class="wizard__count wizard__count--duplicate">{{ report.duplicateCount }} duplicate</span>
              <span class="wizard__count wizard__count--invalid">{{ report.invalidCount }} invalid</span>
            </div>

            @if (report.warnings.length > 0) {
              <ul class="wizard__warnings">
                @for (warning of report.warnings; track warning) {
                  <li>{{ warning }}</li>
                }
              </ul>
            }

            @if (correctionGroups().length > 0) {
              <div class="wizard__corrections">
                <h4>Corrections needed</h4>
                <p class="wizard__corrections-hint">
                  Map each value to an existing one, or create it as new. Rows you leave uncorrected are skipped automatically — the rest of the import still goes through.
                </p>
                @for (group of correctionGroups(); track group.issueType + group.column + group.value) {
                  <div class="wizard__correction-row">
                    <span class="wizard__correction-label">
                      {{ issueLabel(group.issueType) }}: <strong>{{ group.value }}</strong>
                      ({{ group.count }} {{ group.count === 1 ? 'occurrence' : 'occurrences' }})
                    </span>
                    <input
                      type="text"
                      class="wizard__correction-input"
                      [attr.list]="listIdFor(group.issueType)"
                      [(ngModel)]="correctionInputs[group.issueType + '|' + group.column + '|' + group.value]"
                      [placeholder]="group.value"
                    />
                    @if (listIdFor(group.issueType); as listId) {
                      <datalist [id]="listId">
                        @for (option of lookupOptionsFor(group.issueType); track option.value) {
                          <option [value]="option.value">{{ option.label }}</option>
                        }
                      </datalist>
                    }
                    @if (group.issueType === 'UnknownCollection') {
                      <label class="wizard__correction-create-new">
                        <input
                          type="checkbox"
                          [(ngModel)]="correctionCreateNew[group.issueType + '|' + group.column + '|' + group.value]"
                        />
                        Create new
                      </label>
                    }
                    <button
                      type="button"
                      class="wizard__secondary-button"
                      (click)="applyCorrection(group)"
                    >
                      Map to existing ({{ group.count }})
                    </button>
                    @if (group.issueType === 'UnknownCategory') {
                      <button
                        type="button"
                        class="wizard__secondary-button"
                        (click)="openCategoryCreateDialog(group)"
                      >
                        Create New Category
                      </button>
                    }
                  </div>
                }
              </div>
            }

            <div class="wizard__row-filters">
              <button type="button" class="wizard__filter-chip" [class.wizard__filter-chip--active]="rowFilter() === 'all'" (click)="rowFilter.set('all')">
                All ({{ report.rows.length }})
              </button>
              <button type="button" class="wizard__filter-chip" [class.wizard__filter-chip--active]="rowFilter() === 'errors'" (click)="rowFilter.set('errors')">
                Errors ({{ report.invalidCount }})
              </button>
              <button type="button" class="wizard__filter-chip" [class.wizard__filter-chip--active]="rowFilter() === 'warnings'" (click)="rowFilter.set('warnings')">
                Warnings ({{ report.duplicateCount }})
              </button>
            </div>

            <p-table [value]="[...filteredRows()]" [paginator]="true" [rows]="20" [scrollable]="true">
              <ng-template #header>
                <tr>
                  <th>Row</th>
                  <th>Entity</th>
                  <th>Label</th>
                  <th>Status</th>
                  <th>Errors</th>
                  <th>Duplicate SKU</th>
                </tr>
              </ng-template>
              <ng-template #body let-row>
                <tr>
                  <td>{{ row.rowNumber }}</td>
                  <td>{{ row.entityType }}</td>
                  <td>{{ row.label }}</td>
                  <td><app-admin-status-badge [label]="row.status" [tone]="toneFor(row.status)" /></td>
                  <td>{{ row.errors.join(' ') }}</td>
                  <td>
                    @if (hasDuplicateSku(row)) {
                      <div class="wizard__row-override">
                        <button type="button" class="wizard__chip-button" [class.wizard__chip-button--active]="rowOverrideFor(row) === 'Update'" (click)="setRowOverride(row, 'Update')">Update Existing</button>
                        <button type="button" class="wizard__chip-button" [class.wizard__chip-button--active]="rowOverrideFor(row) === 'Rename'" (click)="setRowOverride(row, 'Rename')">Generate New</button>
                        <button type="button" class="wizard__chip-button" [class.wizard__chip-button--active]="rowOverrideFor(row) === 'Skip'" (click)="setRowOverride(row, 'Skip')">Skip</button>
                      </div>
                    }
                  </td>
                </tr>
              </ng-template>
            </p-table>

            <div class="wizard__actions">
              <button type="button" class="wizard__secondary-button" (click)="backToUpload()">Back</button>
              <button type="button" class="wizard__primary-button" (click)="facade.goToStep('strategy')">Next</button>
            </div>
          } @else {
            <div class="wizard__actions">
              <button type="button" class="wizard__secondary-button" (click)="backToUpload()">Back</button>
              <button type="button" class="wizard__primary-button" (click)="facade.runValidation()">Retry validation</button>
            </div>
          }
        </app-admin-section-card>
      }

      @case ('strategy') {
        <app-admin-section-card title="3. Duplicate Strategy" description="How should rows that already exist in the catalog be handled?">
          @for (option of strategyOptions; track option.value) {
            <div class="wizard__radio-group">
              <p-radiobutton
                name="strategy"
                [inputId]="'strategy-' + option.value"
                [value]="option.value"
                [ngModel]="state().strategy"
                (ngModelChange)="facade.setStrategy($event)"
              />
              <label [for]="'strategy-' + option.value">
                <strong>{{ option.value }}</strong> — {{ option.description }}
              </label>
            </div>
          }
        </app-admin-section-card>

        <app-admin-section-card [padded]="true">
          <div class="wizard__actions">
            <button type="button" class="wizard__secondary-button" (click)="facade.goToStep('validate')">Back</button>
            <button type="button" class="wizard__primary-button" (click)="confirmExecuteDialogOpen.set(true)">Execute Import</button>
          </div>
        </app-admin-section-card>
      }

      @case ('execute') {
        <app-admin-section-card title="4. Execute" description="Importing — this runs as a transactional background job. Nothing partial is left behind if it fails.">
          @if (state().executeJob; as job) {
            <app-admin-progress-bar [percent]="job.progressPercent" label="Importing…" />
          } @else {
            <app-admin-progress-bar [indeterminate]="true" label="Importing…" />
          }
        </app-admin-section-card>
      }

      @case ('summary') {
        <app-admin-section-card title="5. Summary" description="Import finished.">
          @if (state().executeJob; as job) {
            @if (job.status === 'Completed' && job.summary; as summary) {
              <div class="wizard__summary-counts">
                <span class="wizard__count wizard__count--new">{{ summary.createdCount }} created</span>
                <span class="wizard__count wizard__count--updated">{{ summary.updatedCount }} updated</span>
                <span class="wizard__count wizard__count--duplicate">{{ summary.skippedCount }} skipped</span>
                <span class="wizard__count wizard__count--invalid">{{ summary.failedCount }} failed</span>
              </div>

              @if (summary.newVariantGroups && summary.newVariantGroups.length > 0) {
                <p class="wizard__summary-subheading">New Variant Groups created</p>
                <ul class="wizard__warnings">
                  @for (group of summary.newVariantGroups; track group) {
                    <li>{{ group }}</li>
                  }
                </ul>
              }

              @if (summary.errors.length > 0) {
                <ul class="wizard__warnings">
                  @for (error of summary.errors; track error) {
                    <li>{{ error }}</li>
                  }
                </ul>
              }
            } @else {
              <p class="wizard__error">Import failed: {{ job.errorMessage }}</p>
            }
          }

          <div class="wizard__actions">
            <button type="button" class="wizard__primary-button" (click)="startOver()">Import another file</button>
            @if (state().executeJob?.resultFileName) {
              <button type="button" class="wizard__secondary-button" (click)="facade.downloadImportReport()">Download Report</button>
            }
          </div>
        </app-admin-section-card>
      }
    }

    @if (state().error) {
      <p class="wizard__error">{{ state().error }}</p>
    }

    <app-admin-confirm-dialog
      [visible]="confirmExecuteDialogOpen()"
      title="Execute import?"
      [message]="'This will write ' + (state().validation?.newCount ?? 0) + ' new and ' + (state().validation?.updatedCount ?? 0) + ' updated records to the catalog. This cannot be undone.'"
      confirmLabel="Execute Import"
      (visibleChange)="confirmExecuteDialogOpen.set($event)"
      (confirmed)="onConfirmExecute()"
    />

    <p-dialog
      header="Create New Category"
      [visible]="categoryDialogOpen()"
      (visibleChange)="onCategoryDialogVisibleChange($event)"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [dismissableMask]="false"
    >
      <app-category-create-form
        mode="create"
        [submitting]="categoryDialogSubmitting()"
        [serverError]="categoryDialogError()"
        [resetToken]="categoryDialogResetToken()"
        [parentOptions]="categoryParentOptions()"
        [initialNameEn]="categoryDialogInitialName()"
        (submitted)="onCategoryCreateSubmit($event)"
        (cancelled)="closeCategoryDialog()"
      />
      <div class="wizard__category-image-picker">
        <span class="wizard__category-image-label">Image (optional)</span>
        <app-admin-file-dropzone accept="image/*" hint="PNG, JPG, WEBP, or GIF" (fileSelected)="onCategoryImageSelected($event)" />
        @if (categoryDialogImageFile(); as file) {
          <span class="wizard__category-image-name">{{ file.name }}</span>
        }
      </div>
    </p-dialog>
  `,
  styles: `
    .wizard__entity-picker,
    .wizard__radio-group {
      margin-bottom: 0.75rem;
    }
    .wizard__radio-group {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
    }
    .wizard__entity-hint {
      display: block;
      font-size: var(--admin-type-caption, 0.75rem);
      color: var(--admin-text-secondary);
    }
    .wizard__password-row {
      margin-bottom: 1rem;
    }
    .wizard__link-button {
      display: inline-block;
      margin: 0.5rem 0 1.25rem;
      padding: 0;
      border: none;
      background: none;
      color: var(--admin-accent-green);
      font-weight: 600;
      text-decoration: underline;
      cursor: pointer;
    }
    .wizard__summary-counts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .wizard__count {
      padding: 0.375rem 0.875rem;
      border-radius: 9999px;
      background: var(--admin-bg-elevated);
      font-weight: 600;
      font-size: var(--admin-type-caption, 0.8125rem);
    }
    .wizard__count--new { color: var(--admin-success, #16a34a); }
    .wizard__count--updated { color: var(--admin-info, #2563eb); }
    .wizard__count--duplicate { color: var(--admin-text-secondary); }
    .wizard__count--invalid { color: var(--admin-danger, #dc2626); }
    .wizard__warnings {
      margin: 0 0 1rem;
      padding-left: 1.25rem;
      color: var(--admin-text-secondary);
    }
    .wizard__summary-subheading {
      margin: 0 0 0.375rem;
      font-weight: 600;
      font-size: var(--admin-type-caption, 0.8125rem);
      color: var(--admin-text-secondary);
    }
    .wizard__row-filters {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .wizard__filter-chip {
      padding: 0.375rem 0.875rem;
      border-radius: 9999px;
      border: 1px solid var(--admin-border-default);
      background: var(--admin-bg-elevated);
      color: var(--admin-text-secondary);
      font-weight: 600;
      font-size: var(--admin-type-caption, 0.8125rem);
      cursor: pointer;
    }
    .wizard__filter-chip--active {
      background: var(--admin-accent-green);
      border-color: var(--admin-accent-green);
      color: #fff;
    }
    .wizard__actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }
    .wizard__primary-button,
    .wizard__secondary-button {
      padding: 0.625rem 1.5rem;
      border: none;
      border-radius: var(--admin-radius-sm, 8px);
      font-weight: 600;
      cursor: pointer;
    }
    .wizard__primary-button {
      background: var(--admin-accent-green);
      color: var(--color-primary-text-on);
    }
    .wizard__secondary-button {
      background: var(--admin-bg-elevated);
      color: var(--admin-text-primary);
      border: 1px solid var(--admin-border-default);
    }
    .wizard__error {
      color: var(--admin-danger, #dc2626);
    }
    .wizard__corrections {
      margin-bottom: 1rem;
      padding: 1rem;
      border: 1px solid var(--admin-border-default);
      border-radius: var(--admin-radius-sm, 8px);
      background: var(--admin-bg-elevated);
    }
    .wizard__corrections h4 {
      margin: 0 0 0.75rem;
    }
    .wizard__corrections-hint {
      margin: 0 0 0.875rem;
      color: var(--admin-text-secondary);
      font-size: var(--admin-type-caption, 0.8125rem);
    }
    .wizard__correction-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
    }
    .wizard__correction-label {
      flex: 1 1 auto;
      min-width: 12rem;
    }
    .wizard__correction-input {
      padding: 0.375rem 0.625rem;
      border-radius: var(--admin-radius-sm, 6px);
      border: 1px solid var(--admin-border-default);
      background: var(--admin-bg-elevated);
      color: var(--admin-text-primary);
    }
    .wizard__correction-create-new {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: var(--admin-type-caption, 0.8125rem);
      color: var(--admin-text-secondary);
      cursor: pointer;
      white-space: nowrap;
    }
    .wizard__row-override {
      display: flex;
      gap: 0.375rem;
      flex-wrap: wrap;
    }
    .wizard__chip-button {
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      border: 1px solid var(--admin-border-default);
      background: var(--admin-bg-elevated);
      color: var(--admin-text-secondary);
      font-size: var(--admin-type-caption, 0.75rem);
      cursor: pointer;
    }
    .wizard__chip-button--active {
      background: var(--admin-accent-green);
      border-color: var(--admin-accent-green);
      color: #fff;
    }
    .wizard__category-image-picker {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--admin-border-default);
    }
    .wizard__category-image-label {
      font-weight: 600;
      font-size: var(--admin-type-caption, 0.8125rem);
      color: var(--admin-text-secondary);
    }
    .wizard__category-image-name {
      font-size: var(--admin-type-caption, 0.8125rem);
      color: var(--admin-text-secondary);
    }
  `,
})
export class CatalogImportWizardPageComponent {
  protected readonly facade = inject(CatalogImportExportFacade);
  private readonly api = inject(CatalogImportExportApiService);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly messageService = inject(MessageService);

  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Products', route: '/admin/products' }, { label: 'Import', route: null });
  protected readonly stepLabels = STEP_LABELS;
  protected readonly entityTypeOptions = ENTITY_TYPE_OPTIONS;
  protected readonly strategyOptions: readonly { value: CatalogDuplicateStrategy; description: string }[] = [
    { value: 'Skip', description: 'Leave existing records untouched.' },
    { value: 'Update', description: 'Overwrite existing records with the incoming values.' },
    { value: 'Merge', description: 'Fill in blanks on existing records without overwriting existing values.' },
    { value: 'Rename', description: 'Keep the existing record and import the incoming row as a new one.' },
  ];
  protected readonly state = this.facade.importState;
  protected readonly lookups = this.facade.lookups;
  protected readonly activeIndex = computed(() => IMPORT_WIZARD_STEPS.indexOf(this.state().step as ImportWizardStep));

  protected readonly rowFilter = signal<'all' | 'errors' | 'warnings'>('all');
  protected readonly filteredRows = computed(() => {
    const rows = this.state().validation?.rows ?? [];
    switch (this.rowFilter()) {
      case 'errors':
        return rows.filter((row) => row.status === 'Invalid');
      case 'warnings':
        return rows.filter((row) => row.status === 'Duplicate');
      default:
        return rows;
    }
  });

  /** Bad values sharing the same (entityType, column, value) collapsed into one "apply to all" action instead of one control per row. */
  protected readonly correctionGroups = computed<CorrectionGroup[]>(() => {
    const rows = this.state().validation?.rows ?? [];
    const groups = new Map<string, CorrectionGroup>();
    for (const row of rows) {
      for (const issue of row.fieldIssues) {
        if (issue.issueType === 'DuplicateSku') {
          continue;
        }

        const key = `${issue.issueType}|${row.entityType}|${issue.column}|${issue.value}`;
        const existing = groups.get(key);
        if (existing) {
          groups.set(key, { ...existing, count: existing.count + 1 });
        } else {
          groups.set(key, { issueType: issue.issueType, entityType: row.entityType, column: issue.column, value: issue.value, count: 1 });
        }
      }
    }

    return [...groups.values()];
  });

  /** Keyed by `${issueType}|${column}|${value}` — holds the admin's typed replacement before "Apply to all" is clicked. */
  protected readonly correctionInputs: Record<string, string> = {};

  protected readonly confirmExecuteDialogOpen = signal(false);

  constructor() {
    void this.facade.loadLookups();
  }

  protected acceptFor(entityType: CatalogImportEntityType): string {
    return entityType === 'FullPackage' ? '.hambox' : '.xlsx,.xlsm,.csv';
  }

  /** Admin-facing name for an entity type — only "Collections" differs from its file/column name (kept as-is in the actual template/contract). */
  protected entityTypeDisplayLabel(entityType: CatalogImportEntityType): string {
    return entityType === 'Collections' ? 'Internal Categories' : entityType;
  }

  protected toneFor(status: CatalogImportRowStatus): 'success' | 'info' | 'neutral' | 'danger' {
    switch (status) {
      case 'New':
        return 'success';
      case 'Updated':
        return 'info';
      case 'Invalid':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  protected issueLabel(issueType: string): string {
    switch (issueType) {
      case 'UnknownCategory':
        return 'Unknown category';
      case 'UnknownCollection':
        return 'Unknown internal category';
      case 'UnknownSupplier':
        return 'Unknown supplier';
      case 'UnknownProduct':
        return 'Unknown product';
      case 'UnknownVariant':
        return 'Unknown variant';
      case 'UnknownVariantGroup':
        return 'Unknown variant group';
      case 'UnknownVariantOption':
        return 'Unknown variant option';
      default:
        return issueType;
    }
  }

  /** Category/Collection/Variant Group all have a DB-backed lookup list — everything else is free text. */
  protected listIdFor(issueType: string): string | null {
    if (issueType === 'UnknownCategory' || issueType === 'UnknownCollection' || issueType === 'UnknownVariantGroup') {
      return `wizard-datalist-${issueType}`;
    }

    return null;
  }

  protected lookupOptionsFor(issueType: string): readonly { value: string; label: string }[] {
    const lookups = this.lookups();
    if (!lookups) {
      return [];
    }

    if (issueType === 'UnknownCategory') {
      return lookups.categories;
    }

    if (issueType === 'UnknownCollection') {
      return lookups.collections;
    }

    if (issueType === 'UnknownVariantGroup') {
      return lookups.variantGroups;
    }

    return [];
  }

  /** Categories/Collections are real global entities a "Create new" checkbox can spin up on the fly — variant groups/options are always created implicitly by adding a row to their sheet, so they don't need this. */
  protected supportsCreateNew(issueType: string): boolean {
    return issueType === 'UnknownCategory' || issueType === 'UnknownCollection';
  }

  /** Keyed the same as `correctionInputs` — whether "Create new" is checked for a given correction group. */
  protected readonly correctionCreateNew: Record<string, boolean> = {};

  protected async applyCorrection(group: CorrectionGroup): Promise<void> {
    const key = `${group.issueType}|${group.column}|${group.value}`;
    const toValue = this.correctionInputs[key]?.trim();
    if (!toValue || toValue === group.value) {
      return;
    }

    const createNew = this.supportsCreateNew(group.issueType) && !!this.correctionCreateNew[key];
    await this.facade.applyCorrection(group.entityType, group.column, group.value, toValue, createNew);
    delete this.correctionInputs[key];
    delete this.correctionCreateNew[key];
  }

  // ---------- Create New Category dialog ----------

  protected readonly categoryDialogOpen = signal(false);
  protected readonly categoryDialogGroup = signal<CorrectionGroup | null>(null);
  protected readonly categoryDialogInitialName = signal('');
  protected readonly categoryDialogImageFile = signal<File | null>(null);
  protected readonly categoryDialogSubmitting = signal(false);
  protected readonly categoryDialogError = signal<string | null>(null);
  protected readonly categoryDialogResetToken = signal(0);
  protected readonly categoryParentOptions = signal<readonly CategoryOption[]>([]);
  private categoryParentOptionsLoaded = false;

  protected async openCategoryCreateDialog(group: CorrectionGroup): Promise<void> {
    this.categoryDialogGroup.set(group);
    this.categoryDialogInitialName.set(group.value);
    this.categoryDialogImageFile.set(null);
    this.categoryDialogError.set(null);
    this.categoryDialogResetToken.update((token) => token + 1);
    this.categoryDialogOpen.set(true);

    if (this.categoryParentOptionsLoaded) {
      return;
    }
    this.categoryParentOptionsLoaded = true;

    try {
      const result = await firstValueFrom(this.categoryApi.getCategories({ pageNumber: 1, pageSize: 500 }));
      this.categoryParentOptions.set(
        result.items.map((category) => ({ id: category.id, label: category.nameEn, parentId: category.parentId })),
      );
    } catch {
      // Non-fatal — the dialog still works, just without a parent category to pick from.
    }
  }

  protected closeCategoryDialog(): void {
    this.categoryDialogOpen.set(false);
    this.categoryDialogGroup.set(null);
  }

  protected onCategoryDialogVisibleChange(visible: boolean): void {
    this.categoryDialogOpen.set(visible);
    if (!visible) {
      this.categoryDialogGroup.set(null);
    }
  }

  protected onCategoryImageSelected(file: File): void {
    this.categoryDialogImageFile.set(file);
  }

  protected async onCategoryCreateSubmit(request: CreateCategoryRequest): Promise<void> {
    const group = this.categoryDialogGroup();
    if (!group) {
      return;
    }

    this.categoryDialogSubmitting.set(true);
    this.categoryDialogError.set(null);

    try {
      const newCategoryId = await createCategoryWithHierarchy(this.categoryApi, request);

      const imageFile = this.categoryDialogImageFile();
      if (imageFile) {
        try {
          await firstValueFrom(this.categoryApi.uploadCategoryImage(newCategoryId, imageFile));
        } catch {
          this.messageService.add({
            severity: 'warn',
            summary: 'Category created',
            detail: 'The image could not be uploaded — add it later from Categories.',
            life: 6000,
          });
        }
      }

      this.facade.addCategoryLookup({ value: request.slug, label: request.nameEn });
      this.closeCategoryDialog();
      await this.facade.applyCorrection(group.entityType, group.column, group.value, request.slug, false);
      this.messageService.add({
        severity: 'success',
        summary: 'Category created',
        detail: `"${request.nameEn}" is now available and applied to ${group.count} ${group.count === 1 ? 'row' : 'rows'}.`,
        life: 5000,
      });
    } catch (error) {
      this.categoryDialogError.set(extractErrorDetail(error, 'Unable to create this category.'));
    } finally {
      this.categoryDialogSubmitting.set(false);
    }
  }

  protected hasDuplicateSku(row: CatalogImportRowResult): boolean {
    return row.fieldIssues.some((issue: CatalogImportFieldIssue) => issue.issueType === 'DuplicateSku');
  }

  protected rowOverrideFor(row: CatalogImportRowResult): CatalogDuplicateStrategy | null {
    const override = this.state().rowOverrides.find((o) => o.rowNumber === row.rowNumber && o.entityType === row.entityType);
    return override?.strategy ?? null;
  }

  protected setRowOverride(row: CatalogImportRowResult, strategy: CatalogDuplicateStrategy): void {
    this.facade.applyRowOverride(row.rowNumber, row.entityType, strategy);
  }

  protected async onFileSelected(file: File): Promise<void> {
    await this.facade.uploadAndValidate(file);

    if (this.state().error) {
      this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: this.state().error ?? '', life: 5000 });
    }
  }

  protected async downloadTemplate(): Promise<void> {
    const entityType = this.state().entityType;
    const blob = await firstValueFrom(this.api.downloadTemplate(entityType));
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${entityType}-template.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected backToUpload(): void {
    this.facade.goToStep('upload');
  }

  protected onConfirmExecute(): void {
    this.confirmExecuteDialogOpen.set(false);
    void this.facade.executeImport();
  }

  protected startOver(): void {
    this.facade.resetImportWizard();
  }
}
