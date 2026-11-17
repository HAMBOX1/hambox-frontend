import { DatePipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';
import { ApiError } from '../../../../core/models/api-error.model';

interface Issue {
  readonly row: number;
  readonly message: string;
}

interface Change {
  readonly productId: string;
  readonly productName: string;
  readonly filterKey: string;
  readonly oldValues: string;
  readonly newValues: string;
}

interface Preview {
  readonly totalRows: number;
  readonly productsToChange: number;
  readonly valuesToAdd: number;
  readonly valuesToRemove: number;
  readonly errors: readonly Issue[];
  readonly warnings: readonly Issue[];
  readonly changes: readonly Change[];
  readonly newValues: readonly string[];
  readonly applied: boolean;
  readonly logId: string | null;
}

interface ImportLog {
  readonly id: string;
  readonly kind: string;
  readonly mode: string;
  readonly fileName: string;
  readonly rowCount: number;
  readonly changedCount: number;
  readonly createdBy: string | null;
  readonly appliedOnUtc: string;
  readonly undoneOnUtc: string | null;
}

type ImportKind = 'products' | 'definitions';

/**
 * Bulk management of filters from Excel / CSV: export the filter library or the products with their filter values, fill the
 * sheet in, then check it (nothing is changed), apply it, and undo it from the history if needed.
 */
@Component({
  selector: 'app-filter-import-export',
  standalone: true,
  imports: [DatePipe, FormsModule, ButtonModule, SelectModule],
  template: `
    <div class="ie">
      <section class="ie__card">
        <h3>Export</h3>
        <p class="ie__note">Download the filter library, or products with the filter values they carry (one column per filter; several values are separated by “|”).</p>
        <div class="ie__row">
          <p-select
            [options]="[...scopeOptions()]"
            optionLabel="label"
            optionValue="id"
            [showClear]="true"
            [filter]="true"
            appendTo="body"
            placeholder="All products"
            [ngModel]="exportCategoryId()"
            (ngModelChange)="exportCategoryId.set($event)"
          />
          <p-select [options]="formats" optionLabel="label" optionValue="value" appendTo="body" [ngModel]="format()" (ngModelChange)="format.set($event)" />
        </div>
        <div class="ie__row">
          <button pButton type="button" icon="pi pi-download" label="Products with filters" severity="secondary" [loading]="busy() === 'products'" (click)="download('products')"></button>
          <button pButton type="button" icon="pi pi-download" label="Filter library" severity="secondary" [loading]="busy() === 'definitions'" (click)="download('definitions')"></button>
          <button pButton type="button" icon="pi pi-file" label="Empty template" severity="secondary" [text]="true" [loading]="busy() === 'template'" (click)="download('template')"></button>
        </div>
      </section>

      <section class="ie__card">
        <h3>Import</h3>
        <div class="ie__row">
          <p-select
            [options]="kinds"
            optionLabel="label"
            optionValue="value"
            appendTo="body"
            [ngModel]="kind()"
            (ngModelChange)="kind.set($event); reset()"
          />
          <input type="file" accept=".xlsx,.csv" (change)="onFile($event)" />
        </div>
        @if (kind() === 'products') {
          <p class="ie__note">
            Each row is one product (ProductId or SKU) and each filter is a column. Only the filter values change: never prices, stock,
            suppliers, orders or the products themselves. Columns that are not in the sheet are left alone.
          </p>
          <div class="ie__row">
            <p-select [options]="modes" optionLabel="label" optionValue="value" appendTo="body" [ngModel]="mode()" (ngModelChange)="mode.set($event); reset()" />
            <label class="ie__check"><input type="checkbox" [ngModel]="allowNew()" (ngModelChange)="allowNew.set($event); reset()" /> Allow new values (they are created, named from the sheet)</label>
          </div>
        } @else {
          <p class="ie__note">Creates or updates filters and their values from the sheet. It never deletes a filter or a value.</p>
        }
        <div class="ie__row">
          <button pButton type="button" icon="pi pi-search" label="Check the file" [disabled]="!file()" [loading]="busy() === 'check'" (click)="run(false)"></button>
          <button pButton type="button" icon="pi pi-check" label="Apply" [disabled]="!canApply()" [loading]="busy() === 'apply'" (click)="run(true)"></button>
        </div>

        @if (preview(); as result) {
          <div class="ie__result" [class.has-errors]="result.errors.length > 0">
            <strong>
              @if (result.applied) {
                Applied.
              } @else if (result.errors.length > 0) {
                {{ result.errors.length }} problem(s): fix the file and upload it again.
              } @else {
                Ready to apply.
              }
            </strong>
            <span>{{ result.totalRows }} row(s) · {{ result.productsToChange }} to change · {{ result.valuesToAdd }} value(s) added · {{ result.valuesToRemove }} removed</span>

            @for (warning of result.warnings; track $index) {
              <p class="ie__warn">{{ warning.row ? 'Row ' + warning.row + ': ' : '' }}{{ warning.message }}</p>
            }
            @if (result.newValues.length) {
              <p class="ie__warn">New values that will be created: {{ result.newValues.join(', ') }}</p>
            }
            @if (result.errors.length) {
              <ul class="ie__errors">
                @for (error of result.errors.slice(0, 30); track $index) {
                  <li>Row {{ error.row }}: {{ error.message }}</li>
                }
              </ul>
              @if (result.errors.length > 30) {
                <p class="ie__note">…and {{ result.errors.length - 30 }} more in the report.</p>
              }
              <button pButton type="button" size="small" icon="pi pi-download" label="Download the error report" severity="secondary" (click)="downloadReport(result)"></button>
            }
            @if (result.changes.length) {
              <div class="ie__table-wrap">
                <table class="ie__table">
                  <thead><tr><th>Product</th><th>Filter</th><th>Before</th><th>After</th></tr></thead>
                  <tbody>
                    @for (change of result.changes; track $index) {
                      <tr><td>{{ change.productName }}</td><td>{{ change.filterKey }}</td><td>{{ change.oldValues || '—' }}</td><td>{{ change.newValues || '—' }}</td></tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (result.productsToChange > result.changes.length) {
                <p class="ie__note">Showing the first {{ result.changes.length }} changes.</p>
              }
            }
          </div>
        }
      </section>

      <section class="ie__card">
        <h3>Import history</h3>
        @if (logs().length === 0) {
          <p class="ie__note">No imports yet.</p>
        } @else {
          <div class="ie__table-wrap">
            <table class="ie__table">
              <thead><tr><th>When</th><th>What</th><th>File</th><th>Rows</th><th>Changed</th><th>By</th><th></th></tr></thead>
              <tbody>
                @for (log of logs(); track log.id) {
                  <tr [class.is-undone]="log.undoneOnUtc">
                    <td>{{ log.appliedOnUtc | date: 'medium' }}</td>
                    <td>{{ log.kind }} · {{ log.mode }}</td>
                    <td>{{ log.fileName }}</td>
                    <td>{{ log.rowCount }}</td>
                    <td>{{ log.changedCount }}</td>
                    <td>{{ log.createdBy }}</td>
                    <td>
                      @if (log.undoneOnUtc) {
                        <em>undone</em>
                      } @else if (log.kind === 'Products') {
                        <button pButton type="button" size="small" label="Undo" severity="secondary" [text]="true" (click)="undo(log)"></button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .ie {
      display: grid;
      gap: 1rem;
    }

    .ie__card {
      display: grid;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid var(--admin-border-default);
      border-radius: 0.75rem;
      background: var(--admin-bg-panel);
    }

    .ie__card h3 {
      margin: 0;
    }

    .ie__note {
      margin: 0;
      color: var(--admin-text-secondary);
    }

    .ie__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
    }

    .ie__check {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .ie__result {
      display: grid;
      gap: 0.5rem;
      padding: 0.85rem;
      border: 1px solid color-mix(in srgb, var(--admin-primary) 50%, transparent);
      border-radius: 0.6rem;
    }

    .ie__result.has-errors {
      border-color: color-mix(in srgb, var(--admin-accent-red, #e5484d) 60%, transparent);
    }

    .ie__warn {
      margin: 0;
      color: var(--admin-accent-amber, #f5b840);
    }

    .ie__errors {
      margin: 0;
      padding-inline-start: 1.2rem;
      color: var(--admin-accent-red, #e5484d);
    }

    .ie__table-wrap {
      max-height: 22rem;
      overflow: auto;
    }

    .ie__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .ie__table th,
    .ie__table td {
      padding: 0.4rem 0.6rem;
      border-bottom: 1px solid var(--admin-border-subtle);
      text-align: start;
    }

    .is-undone {
      opacity: 0.55;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterImportExportComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly messages = inject(MessageService);

  /** Platforms / categories the product export can be limited to. */
  readonly categories = input<readonly { id: string; label: string }[]>([]);
  protected readonly scopeOptions = computed(() => this.categories());

  protected readonly formats = [
    { label: 'Excel (.xlsx)', value: 'xlsx' },
    { label: 'CSV', value: 'csv' },
  ];
  protected readonly kinds = [
    { label: 'Products and their filter values', value: 'products' as ImportKind },
    { label: 'Filters and their values (library)', value: 'definitions' as ImportKind },
  ];
  protected readonly modes = [
    { label: 'Add values (merge with existing)', value: 'Merge' },
    { label: 'Replace existing values', value: 'Replace' },
    { label: 'Remove these values', value: 'Remove' },
  ];

  protected readonly format = signal('xlsx');
  protected readonly exportCategoryId = signal<string | null>(null);
  protected readonly kind = signal<ImportKind>('products');
  protected readonly mode = signal('Merge');
  protected readonly allowNew = signal(false);
  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<Preview | null>(null);
  protected readonly logs = signal<readonly ImportLog[]>([]);
  protected readonly busy = signal<string | null>(null);

  protected readonly canApply = computed(() => {
    const result = this.preview();
    return !!this.file() && !!result && !result.applied && result.errors.length === 0 && (result.productsToChange > 0 || result.valuesToAdd > 0);
  });

  ngOnInit(): void {
    void this.loadLogs();
  }

  protected onFile(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.reset();
  }

  protected reset(): void {
    this.preview.set(null);
  }

  protected async download(what: 'products' | 'definitions' | 'template'): Promise<void> {
    this.busy.set(what);
    try {
      let params = new HttpParams().set('format', this.format());
      let path = '/api/v1/filters/export/definitions';
      if (what !== 'definitions') {
        path = '/api/v1/filters/export/products';
        if (what === 'template') {
          params = params.set('template', true);
        } else if (this.exportCategoryId()) {
          params = params.set('categoryId', this.exportCategoryId() as string);
        }
      }

      const response = await firstValueFrom(this.http.get(`${this.baseUrl}${path}`, { params, responseType: 'blob', observe: 'response' }));
      const disposition = response.headers.get('content-disposition') ?? '';
      const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1] ?? `filters.${this.format()}`;
      this.save(response.body as Blob, decodeURIComponent(name));
    } catch {
      this.messages.add({ severity: 'error', summary: 'Could not create the file', life: 4000 });
    } finally {
      this.busy.set(null);
    }
  }

  protected async run(apply: boolean): Promise<void> {
    const file = this.file();
    if (!file) {
      return;
    }

    const form = new FormData();
    form.append('file', file);
    form.append('apply', String(apply));
    if (this.kind() === 'products') {
      form.append('mode', this.mode());
      form.append('allowNewValues', String(this.allowNew()));
    }

    this.busy.set(apply ? 'apply' : 'check');
    try {
      const result = await firstValueFrom(
        this.http.post<Preview>(`${this.baseUrl}/api/v1/filters/import/${this.kind()}`, form),
      );
      this.preview.set(result);
      if (result.applied) {
        this.messages.add({ severity: 'success', summary: 'Import applied', life: 4000 });
        await this.loadLogs();
      }
    } catch (error) {
      this.messages.add({ severity: 'error', summary: error instanceof ApiError && error.message ? error.message : 'Could not read the file', life: 6000 });
    } finally {
      this.busy.set(null);
    }
  }

  protected async undo(log: ImportLog): Promise<void> {
    if (!confirm(`Undo the import of “${log.fileName}”? The tags it added are removed and the ones it removed come back.`)) {
      return;
    }

    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/api/v1/filters/import/logs/${log.id}/undo`, {}));
      this.messages.add({ severity: 'success', summary: 'Import undone', life: 4000 });
      await this.loadLogs();
    } catch (error) {
      this.messages.add({ severity: 'error', summary: error instanceof ApiError && error.message ? error.message : 'Could not undo the import', life: 5000 });
    }
  }

  protected downloadReport(result: Preview): void {
    const lines = ['Row,Problem', ...result.errors.map((e) => `${e.row},"${e.message.replace(/"/g, '""')}"`)];
    this.save(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'filter-import-errors.csv');
  }

  private save(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  private async loadLogs(): Promise<void> {
    try {
      this.logs.set(await firstValueFrom(this.http.get<readonly ImportLog[]>(`${this.baseUrl}/api/v1/filters/import/logs`)));
    } catch {
      this.logs.set([]);
    }
  }
}
