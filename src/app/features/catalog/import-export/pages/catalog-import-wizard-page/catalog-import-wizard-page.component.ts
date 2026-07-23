import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { PasswordModule } from 'primeng/password';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

import {
  AdminFileDropzoneComponent,
  AdminPageHeaderComponent,
  AdminProgressBarComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminStepperComponent,
  AdminStepperStep,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import {
  CatalogDuplicateStrategy,
  CatalogImportEntityType,
  CatalogImportRowStatus,
  IMPORT_WIZARD_STEPS,
  ImportWizardStep,
} from '../../models/import-export.model';
import { CatalogImportExportApiService } from '../../services/catalog-import-export-api.service';
import { CatalogImportExportFacade } from '../../services/catalog-import-export.facade';

const STEP_LABELS: readonly AdminStepperStep[] = [
  { label: 'Upload', icon: 'pi-upload' },
  { label: 'Validate', icon: 'pi-search' },
  { label: 'Strategy', icon: 'pi-sliders-h' },
  { label: 'Execute', icon: 'pi-cog' },
  { label: 'Summary', icon: 'pi-check-circle' },
];

const ENTITY_TYPE_OPTIONS: readonly { label: string; value: CatalogImportEntityType }[] = [
  { label: 'Full catalog package (.hambox)', value: 'FullPackage' },
  { label: 'Products', value: 'Products' },
  { label: 'Categories', value: 'Categories' },
  { label: 'Inventory (variants)', value: 'Inventory' },
  { label: 'Digital codes', value: 'Codes' },
];

@Component({
  selector: 'app-catalog-import-wizard-page',
  standalone: true,
  imports: [
    FormsModule,
    PasswordModule,
    RadioButtonModule,
    TableModule,
    ToastModule,
    AdminFileDropzoneComponent,
    AdminPageHeaderComponent,
    AdminProgressBarComponent,
    AdminSectionCardComponent,
    AdminStatusBadgeComponent,
    AdminStepperComponent,
  ],
  providers: [CatalogImportExportFacade, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast />
    <app-admin-page-header
      title="Import Catalog"
      subtitle="Upload a .hambox package or a Products/Categories/Inventory/Codes template. Nothing is written until you review and confirm."
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
                <label [for]="'entity-' + option.value">{{ option.label }}</label>
              </div>
            }
          </div>

          @if (state().entityType !== 'FullPackage') {
            <button type="button" class="wizard__link-button" (click)="downloadTemplate()">
              Download {{ state().entityType }} template
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
            hint="Accepts .hambox, .xlsx, or .csv"
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

            <p-table [value]="[...report.rows]" [paginator]="true" [rows]="20" [scrollable]="true">
              <ng-template #header>
                <tr>
                  <th>Row</th>
                  <th>Entity</th>
                  <th>Label</th>
                  <th>Status</th>
                  <th>Errors</th>
                </tr>
              </ng-template>
              <ng-template #body let-row>
                <tr>
                  <td>{{ row.rowNumber }}</td>
                  <td>{{ row.entityType }}</td>
                  <td>{{ row.label }}</td>
                  <td><app-admin-status-badge [label]="row.status" [tone]="toneFor(row.status)" /></td>
                  <td>{{ row.errors.join(' ') }}</td>
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

          <div class="wizard__actions">
            <button type="button" class="wizard__secondary-button" (click)="facade.goToStep('validate')">Back</button>
            <button type="button" class="wizard__primary-button" (click)="facade.executeImport()">Execute Import</button>
          </div>
        </app-admin-section-card>
      }

      @case ('execute') {
        <app-admin-section-card title="4. Execute" description="Importing — this runs as a transactional background job. Nothing partial is left behind if it fails.">
          <app-admin-progress-bar [percent]="state().executeJob?.progressPercent ?? 0" label="Importing…" />
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
          </div>
        </app-admin-section-card>
      }
    }

    @if (state().error) {
      <p class="wizard__error">{{ state().error }}</p>
    }
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
      color: #fff;
    }
    .wizard__secondary-button {
      background: var(--admin-bg-elevated);
      color: var(--admin-text-primary);
      border: 1px solid var(--admin-border-default);
    }
    .wizard__error {
      color: var(--admin-danger, #dc2626);
    }
  `,
})
export class CatalogImportWizardPageComponent {
  protected readonly facade = inject(CatalogImportExportFacade);
  private readonly api = inject(CatalogImportExportApiService);
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
  protected readonly activeIndex = computed(() => IMPORT_WIZARD_STEPS.indexOf(this.state().step as ImportWizardStep));

  protected acceptFor(entityType: CatalogImportEntityType): string {
    return entityType === 'FullPackage' ? '.hambox' : '.xlsx,.csv';
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
    this.facade.resetImportWizard();
  }

  protected startOver(): void {
    this.facade.resetImportWizard();
  }
}
