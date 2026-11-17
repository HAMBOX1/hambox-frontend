import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { AdminSectionCardComponent } from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { FilterDefinition, FilterLibraryApiService } from '../../services/filter-library-api.service';
import { ProductEditorFacade } from '../../services/product-editor.facade';

/**
 * The product page's Filters card: for each filter in the library, which of its values this product carries. These are the
 * values customers can filter by on the store (Game Mode, Offers, ...).
 */
@Component({
  selector: 'app-product-filter-values-panel',
  standalone: true,
  imports: [FormsModule, ButtonModule, MultiSelectModule, SelectModule, HasPermissionDirective, AdminSectionCardComponent],
  template: `
    <app-admin-section-card title="Storefront filters" description="Tag this product with the values of your custom filters, so customers can find it by them.">
      @if (filters().length === 0) {
        <p class="panel__note">No custom filters yet. Create them in Catalog → Filters.</p>
      } @else {
        <div class="panel">
          @for (filter of filters(); track filter.id) {
            <label class="panel__field" [class.is-off]="!filter.isActive">
              <span>{{ filter.nameEn }}@if (!filter.isActive) { <em> (switched off)</em> }</span>
              @if (filter.isMultiSelect) {
                <p-multiSelect
                  [options]="[...filter.values]"
                  optionLabel="labelEn"
                  optionValue="value"
                  display="chip"
                  appendTo="body"
                  placeholder="None"
                  [ngModel]="selected()[filter.key] ?? []"
                  (ngModelChange)="set(filter.key, $event ?? [])"
                />
              } @else {
                <p-select
                  [options]="[...filter.values]"
                  optionLabel="labelEn"
                  optionValue="value"
                  [showClear]="true"
                  appendTo="body"
                  placeholder="None"
                  [ngModel]="(selected()[filter.key] ?? [])[0] ?? null"
                  (ngModelChange)="set(filter.key, $event ? [$event] : [])"
                />
              }
            </label>
          }
          <div *hamboxHasPermission="permissions.Catalog.Products.Edit">
            <button pButton type="button" label="Save filters" icon="pi pi-save" [loading]="saving()" (click)="save()"></button>
          </div>
        </div>
      }
    </app-admin-section-card>
  `,
  styles: `
    .panel {
      display: grid;
      gap: 1rem;
      max-width: 32rem;
    }

    .panel__field {
      display: grid;
      gap: 0.35rem;
      font-weight: 600;
    }

    .panel__field.is-off {
      opacity: 0.7;
    }

    .panel__note {
      margin: 0;
      color: var(--admin-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFilterValuesPanelComponent {
  private readonly facade = inject(ProductEditorFacade);
  private readonly api = inject(FilterLibraryApiService);
  private readonly messages = inject(MessageService);

  protected readonly permissions = PERMISSIONS;
  protected readonly filters = signal<readonly FilterDefinition[]>([]);
  protected readonly selected = signal<Readonly<Record<string, readonly string[]>>>({});
  protected readonly saving = signal(false);

  constructor() {
    effect(() => {
      const product = this.facade.product();
      if (product) {
        void this.load(product.id);
      }
    });
  }

  protected set(key: string, values: readonly string[]): void {
    this.selected.update((current) => ({ ...current, [key]: values }));
  }

  protected async save(): Promise<void> {
    const product = this.facade.product();
    if (!product) {
      return;
    }

    this.saving.set(true);
    try {
      await firstValueFrom(this.api.setProductValues(product.id, this.selected()));
      this.messages.add({ severity: 'success', summary: 'Filters saved', life: 3000 });
    } catch {
      this.messages.add({ severity: 'error', summary: 'Could not save the filters', life: 4000 });
    } finally {
      this.saving.set(false);
    }
  }

  private async load(productId: string): Promise<void> {
    try {
      const [filters, values] = await Promise.all([
        firstValueFrom(this.api.list()),
        firstValueFrom(this.api.productValues(productId)),
      ]);
      this.filters.set(filters);
      this.selected.set(values);
    } catch {
      this.filters.set([]);
    }
  }
}
