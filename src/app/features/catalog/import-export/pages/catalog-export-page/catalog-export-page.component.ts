import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastModule } from 'primeng/toast';

import {
  AdminPageHeaderComponent,
  AdminProgressBarComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { CatalogPackageFormat, CatalogPackageOptions, defaultCatalogPackageOptions } from '../../models/import-export.model';
import { CatalogImportExportFacade } from '../../services/catalog-import-export.facade';

type ExportScopeMode = 'entire' | 'filtered' | 'selected';

@Component({
  selector: 'app-catalog-export-page',
  standalone: true,
  imports: [
    FormsModule,
    CheckboxModule,
    InputTextModule,
    PasswordModule,
    RadioButtonModule,
    ToastModule,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminProgressBarComponent,
  ],
  providers: [CatalogImportExportFacade, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast />
    <app-admin-page-header
      title="Export Catalog"
      subtitle="Bundle products, categories, variants, inventory, and more into a downloadable package for backup or migration to another HAMBOX site."
      [breadcrumbs]="breadcrumbs"
    />

    <app-admin-section-card title="Scope" description="What should be exported?">
      <div class="export-page__radio-group">
        <p-radiobutton name="scope" inputId="scope-entire" value="entire" [ngModel]="scopeMode()" (ngModelChange)="scopeMode.set($event)" />
        <label for="scope-entire">Entire catalog</label>
      </div>
      <div class="export-page__radio-group">
        <p-radiobutton name="scope" inputId="scope-filtered" value="filtered" [ngModel]="scopeMode()" (ngModelChange)="scopeMode.set($event)" />
        <label for="scope-filtered">Filtered results</label>
      </div>
      @if (selectedProductIds().length > 0) {
        <div class="export-page__radio-group">
          <p-radiobutton name="scope" inputId="scope-selected" value="selected" [ngModel]="scopeMode()" (ngModelChange)="scopeMode.set($event)" />
          <label for="scope-selected">Selected products ({{ selectedProductIds().length }})</label>
        </div>
      }

      @if (scopeMode() === 'filtered') {
        <div class="export-page__filter-row">
          <input pInputText type="text" placeholder="Search term" [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" />
        </div>
      }
    </app-admin-section-card>

    <app-admin-section-card title="Format" description="Choose the package format.">
      <div class="export-page__radio-group">
        <p-radiobutton name="format" inputId="format-hambox" value="Hambox" [ngModel]="format()" (ngModelChange)="format.set($event)" />
        <label for="format-hambox">HAMBOX Package (.hambox) — full catalog, primary format</label>
      </div>
      <div class="export-page__radio-group">
        <p-radiobutton name="format" inputId="format-xlsx" value="Xlsx" [ngModel]="format()" (ngModelChange)="format.set($event)" />
        <label for="format-xlsx">Excel (.xlsx) — products only</label>
      </div>
      <div class="export-page__radio-group">
        <p-radiobutton name="format" inputId="format-csv" value="Csv" [ngModel]="format()" (ngModelChange)="format.set($event)" />
        <label for="format-csv">CSV — products only</label>
      </div>
    </app-admin-section-card>

    @if (format() === 'Hambox') {
      <app-admin-section-card title="Include" description="What should the package contain?">
        <div class="export-page__checkbox-grid">
          <div class="export-page__checkbox-item">
            <p-checkbox [binary]="true" inputId="opt-categories" [ngModel]="options().includeCategories" (ngModelChange)="patchOption('includeCategories', $event)" label="Categories" />
            <p class="export-page__checkbox-hint">Category tree for every included product, plus parent categories needed to keep it valid.</p>
          </div>
          <div class="export-page__checkbox-item">
            <p-checkbox [binary]="true" inputId="opt-variants" [ngModel]="options().includeVariants" (ngModelChange)="patchOption('includeVariants', $event)" label="Variants" />
            <p class="export-page__checkbox-hint">Option groups, options, and SKU variants. Required for Inventory and Digital Codes below.</p>
          </div>
          <div class="export-page__checkbox-item">
            <p-checkbox [binary]="true" inputId="opt-inventory" [ngModel]="options().includeInventory" [disabled]="options().includeDigitalCodes" (ngModelChange)="patchOption('includeInventory', $event)" label="Inventory" />
            <p class="export-page__checkbox-hint">Stock quantities. Locked on while Digital Codes is checked, since codes live inside inventory batches.</p>
          </div>
          <div class="export-page__checkbox-item">
            <p-checkbox [binary]="true" inputId="opt-codes" [ngModel]="options().includeDigitalCodes" (ngModelChange)="onDigitalCodesChange($event)" label="Digital Codes" />
            <p class="export-page__checkbox-hint">Actual redemption codes, serials, and PINs — sensitive, see Security below.</p>
          </div>
          <div class="export-page__checkbox-item">
            <p-checkbox [binary]="true" inputId="opt-images" [ngModel]="options().includeImages" (ngModelChange)="patchOption('includeImages', $event)" label="Images" />
            <p class="export-page__checkbox-hint">Product image files, bundled into the package.</p>
          </div>
          <div class="export-page__checkbox-item">
            <p-checkbox [binary]="true" inputId="opt-localization" [ngModel]="options().includeLocalization" (ngModelChange)="patchOption('includeLocalization', $event)" label="Localization" />
            <p class="export-page__checkbox-hint">Arabic name and description fields, in addition to the English ones.</p>
          </div>
          <div class="export-page__checkbox-item">
            <p-checkbox [binary]="true" inputId="opt-suppliers" [ngModel]="options().includeSuppliers" (ngModelChange)="patchOption('includeSuppliers', $event)" label="Suppliers" />
            <p class="export-page__checkbox-hint">Supplier product mappings, buying prices, and priority — internal cost data.</p>
          </div>
          <div class="export-page__checkbox-item">
            <p-checkbox [binary]="true" inputId="opt-collections" [ngModel]="options().includeCollections" (ngModelChange)="patchOption('includeCollections', $event)" label="Collections" />
            <p class="export-page__checkbox-hint">Internal, owner-only collection tree and each product's collection assignments. Never customer-facing.</p>
          </div>
        </div>
      </app-admin-section-card>

      <app-admin-section-card title="Security" description="Digital codes are sensitive — protect them if this package leaves your infrastructure.">
        <div class="export-page__checkbox-grid">
          <div class="export-page__checkbox-item">
            <p-checkbox [binary]="true" inputId="opt-encrypt" [ngModel]="encryptCodes()" [disabled]="!options().includeDigitalCodes" (ngModelChange)="encryptCodes.set($event)" label="Encrypt digital codes" />
            <p class="export-page__checkbox-hint">
              Scrambles just the codes file inside the package with the password below — the rest of the package (products, images, etc.) stays readable.
              @if (!options().includeDigitalCodes) {
                Enable "Digital Codes" under Include to use this.
              }
            </p>
          </div>
          <div class="export-page__checkbox-item">
            <p-checkbox [binary]="true" inputId="opt-password" [ngModel]="passwordProtect()" (ngModelChange)="passwordProtect.set($event)" label="Password-protect the package" />
            <p class="export-page__checkbox-hint">Encrypts the entire .hambox file — nobody can even open the package without the password. Independent of the option above; use both for double protection.</p>
          </div>
        </div>
        @if (encryptCodes() || passwordProtect()) {
          <div class="export-page__filter-row">
            <p-password [ngModel]="packagePassword()" (ngModelChange)="packagePassword.set($event)" [feedback]="false" [toggleMask]="true" placeholder="Package password (min. 6 characters)" />
          </div>
        }
      </app-admin-section-card>
    }

    <div class="export-page__actions">
      <button type="button" class="export-page__primary-button" [disabled]="exportState().status === 'running'" (click)="startExport()">
        @if (exportState().status === 'running') {
          Exporting…
        } @else {
          Start Export
        }
      </button>

      @if (canDownload()) {
        <button type="button" class="export-page__secondary-button" (click)="download()">Download</button>
      }
    </div>

    @if (exportState().status === 'running' || exportState().status === 'done') {
      <app-admin-progress-bar
        [percent]="exportState().job?.progressPercent ?? 0"
        [label]="exportState().status === 'done' ? 'Export complete' : 'Building package…'"
      />
    }

    @if (exportState().status === 'error') {
      <p class="export-page__error">{{ exportState().error }}</p>
    }
  `,
  styles: `
    .export-page__radio-group {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 0.75rem;
    }
    .export-page__filter-row {
      margin: 0.75rem 0;
    }
    .export-page__checkbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem 1.5rem;
    }
    .export-page__checkbox-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .export-page__checkbox-hint {
      margin: 0 0 0 1.75rem;
      font-size: 0.8125rem;
      color: var(--admin-text-secondary, var(--admin-text-muted));
    }
    .export-page__actions {
      display: flex;
      gap: 0.75rem;
      margin: 1.5rem 0;
    }
    .export-page__primary-button,
    .export-page__secondary-button {
      padding: 0.625rem 1.5rem;
      border: none;
      border-radius: var(--admin-radius-sm, 8px);
      font-weight: 600;
      cursor: pointer;
    }
    .export-page__primary-button {
      background: var(--admin-accent-green);
      color: #fff;
    }
    .export-page__primary-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .export-page__secondary-button {
      background: var(--admin-bg-elevated);
      color: var(--admin-text-primary);
      border: 1px solid var(--admin-border-default);
    }
    .export-page__error {
      color: var(--admin-danger, #dc2626);
    }
  `,
})
export class CatalogExportPageComponent implements OnInit {
  private readonly facade = inject(CatalogImportExportFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);

  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Products', route: '/admin/products' }, { label: 'Export', route: null });

  protected readonly scopeMode = signal<ExportScopeMode>('entire');
  protected readonly searchTerm = signal('');
  protected readonly format = signal<CatalogPackageFormat>('Hambox');
  protected readonly options = signal<CatalogPackageOptions>(defaultCatalogPackageOptions());
  protected readonly encryptCodes = signal(false);
  protected readonly passwordProtect = signal(false);
  protected readonly packagePassword = signal('');
  protected readonly selectedProductIds = signal<readonly string[]>([]);

  protected readonly exportState = this.facade.exportState;
  protected readonly canDownload = computed(() => this.facade.canDownloadExport());

  ngOnInit(): void {
    const idsParam = this.route.snapshot.queryParamMap.get('productIds');
    if (idsParam) {
      this.selectedProductIds.set(idsParam.split(',').filter(Boolean));
      this.scopeMode.set('selected');
    }
  }

  protected patchOption(key: keyof CatalogPackageOptions, value: boolean): void {
    this.options.update((current) => ({ ...current, [key]: value }));
  }

  protected onDigitalCodesChange(value: boolean): void {
    this.options.update((current) => ({ ...current, includeDigitalCodes: value, includeInventory: value ? true : current.includeInventory }));
    if (!value) {
      this.encryptCodes.set(false);
    }
  }

  protected async startExport(): Promise<void> {
    if ((this.encryptCodes() || this.passwordProtect()) && this.packagePassword().length < 6) {
      this.messageService.add({
        severity: 'error',
        summary: 'Password required',
        detail: 'Enter a package password of at least 6 characters.',
        life: 4000,
      });
      return;
    }

    await this.facade.startExport({
      productIds: this.scopeMode() === 'selected' ? this.selectedProductIds() : undefined,
      searchTerm: this.scopeMode() === 'filtered' ? this.searchTerm() : undefined,
      selectAllMatching: this.scopeMode() === 'filtered',
      exportEntireCatalog: this.scopeMode() === 'entire',
      format: this.format(),
      options: this.options(),
      encryptCodes: this.encryptCodes(),
      passwordProtectPackage: this.passwordProtect(),
      packagePassword: this.packagePassword() || undefined,
    });

    if (this.exportState().status === 'error') {
      this.messageService.add({ severity: 'error', summary: 'Export failed', detail: this.exportState().error ?? '', life: 5000 });
    }
  }

  protected async download(): Promise<void> {
    await this.facade.downloadExport();
  }
}
