import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ButtonEditorComponent } from '../../../../../shared/components/admin/button-editor/button-editor.component';
import { CategoryPickerComponent } from '../../../../../shared/components/admin/category-picker/category-picker.component';
import { ProductPickerComponent } from '../../../../../shared/components/admin/product-picker/product-picker.component';
import { ProductCollection } from '../../../../catalog/models/collection.model';
import { CollectionApiService } from '../../../../catalog/services/collection-api.service';
import {
  DEFAULT_PRODUCTS_CONFIG,
  SectionButtonAlign,
  SectionCommonConfig,
  SectionProductRotation,
  SectionProductSource,
  SectionProductsConfig,
} from '../../../../home/section-registry/models/section-common.model';

/**
 * Options shared by every section, edited under the section's own settings: heading size and colour, a
 * call-to-action button, and (Products sections) where the products come from — picked by hand, from a category
 * or an internal category — with how many to show and whether they rotate. Stored under `_common` in the config.
 */
@Component({
  selector: 'app-section-common-settings',
  standalone: true,
  imports: [FormsModule, ButtonEditorComponent, CategoryPickerComponent, ProductPickerComponent],
  template: `
    <div class="common">
      <h4 class="common__title">Appearance</h4>

      <div class="common__row">
        <label for="common-title-size">Heading size (px)</label>
        <input
          id="common-title-size"
          type="number"
          min="0"
          max="96"
          step="1"
          [disabled]="disabled()"
          [ngModel]="config().titleFontSize ?? 0"
          (ngModelChange)="patch({ titleFontSize: $event > 0 ? $event : null })"
        />
        <small>0 keeps the default size.</small>
      </div>

      <div class="common__row">
        <label for="common-title-color">Heading colour</label>
        <div class="common__color">
          <input
            id="common-title-color"
            type="color"
            [disabled]="disabled()"
            [ngModel]="config().titleColor ?? '#ffffff'"
            (ngModelChange)="patch({ titleColor: $event })"
          />
          <button type="button" class="common__link" [disabled]="disabled() || !config().titleColor" (click)="patch({ titleColor: null })">
            Reset
          </button>
        </div>
      </div>

      <app-button-editor
        title="Button under this section"
        [label]="config().buttonLabel"
        [url]="config().buttonUrl"
        [disabled]="disabled()"
        (labelChange)="patch({ buttonLabel: $event || null })"
        (urlChange)="patch({ buttonUrl: $event || null })"
      />

      @if (config().buttonLabel && config().buttonUrl) {
        <div class="common__row">
          <label for="common-button-align">Button position</label>
          <select
            id="common-button-align"
            [disabled]="disabled()"
            [ngModel]="config().buttonAlign"
            (ngModelChange)="patch({ buttonAlign: $event })"
          >
            <option value="start">Start</option>
            <option value="center">Centre</option>
            <option value="end">End</option>
          </select>
        </div>
      }

      @if (showProducts()) {
        <h4 class="common__title">Products shown</h4>

        <div class="common__row">
          <label for="common-source">Take products from</label>
          <select id="common-source" [disabled]="disabled()" [ngModel]="products().source" (ngModelChange)="patchProducts({ source: $event })">
            <option value="auto">Default featured products</option>
            <option value="manual">Products I choose</option>
            <option value="category">A category</option>
            <option value="internal">An internal category</option>
          </select>
        </div>

        @switch (products().source) {
          @case ('manual') {
            <app-product-picker [value]="products().productIds" [disabled]="disabled()" (valueChange)="patchProducts({ productIds: $event })" />
          }
          @case ('category') {
            <app-category-picker [value]="products().categoryIds" [disabled]="disabled()" (valueChange)="patchProducts({ categoryIds: $event })" />
          }
          @case ('internal') {
            <div class="common__row">
              <label for="common-collection">Internal category</label>
              <select
                id="common-collection"
                [disabled]="disabled()"
                [ngModel]="products().collectionId ?? ''"
                (ngModelChange)="patchProducts({ collectionId: $event || null })"
              >
                <option value="">Choose…</option>
                @for (collection of collections(); track collection.id) {
                  <option [value]="collection.id">{{ collection.name }}</option>
                }
              </select>
            </div>
          }
        }

        <div class="common__row">
          <label for="common-limit">How many to show</label>
          <input
            id="common-limit"
            type="number"
            min="1"
            max="24"
            [disabled]="disabled()"
            [ngModel]="products().limit"
            (ngModelChange)="patchProducts({ limit: $event })"
          />
        </div>

        @if (products().source !== 'manual') {
          <div class="common__row">
            <label for="common-rotation">When there are more than that</label>
            <select id="common-rotation" [disabled]="disabled()" [ngModel]="products().rotation" (ngModelChange)="patchProducts({ rotation: $event })">
              <option value="none">Always the same first ones</option>
              <option value="daily">A different set every day</option>
              <option value="random">Random on every visit</option>
            </select>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .common {
      display: grid;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--admin-border-default, rgba(255, 255, 255, 0.12));
    }

    .common__title {
      margin: 0.25rem 0 0;
      font-size: 0.95rem;
    }

    .common__row {
      display: grid;
      gap: 0.35rem;
    }

    .common__row label {
      font-weight: 600;
      font-size: 0.85rem;
    }

    .common__row small {
      color: var(--admin-text-secondary);
    }

    .common__row input[type='number'],
    .common__row select {
      min-height: 2.5rem;
      padding: 0 0.6rem;
      border: 1px solid var(--admin-border-default, rgba(255, 255, 255, 0.2));
      border-radius: 0.5rem;
      background: var(--admin-bg-surface, transparent);
      color: inherit;
    }

    .common__color {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .common__color input[type='color'] {
      width: 3rem;
      height: 2.5rem;
      padding: 0;
      border: 1px solid var(--admin-border-default, rgba(255, 255, 255, 0.2));
      border-radius: 0.5rem;
      background: transparent;
    }

    .common__link {
      border: none;
      background: none;
      color: var(--admin-accent-blue, #60a5fa);
      cursor: pointer;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionCommonSettingsComponent {
  private readonly collectionApi = inject(CollectionApiService);

  readonly config = input.required<SectionCommonConfig>();
  /** True for Products sections, whose items the admin can source. */
  readonly showProducts = input(false);
  readonly disabled = input(false);
  readonly configChange = output<SectionCommonConfig>();

  protected readonly collections = signal<readonly ProductCollection[]>([]);
  protected readonly products = computed<SectionProductsConfig>(() => this.config().products ?? DEFAULT_PRODUCTS_CONFIG);

  constructor() {
    void this.loadCollections();
  }

  protected patch(change: Partial<SectionCommonConfig>): void {
    this.configChange.emit({ ...this.config(), ...change });
  }

  protected patchProducts(change: Partial<SectionProductsConfig>): void {
    const next: SectionProductsConfig = {
      ...this.products(),
      ...change,
      limit: Math.min(Math.max(Math.round(Number(change.limit ?? this.products().limit)) || 4, 1), 24),
    };
    this.patch({ products: next });
  }

  private async loadCollections(): Promise<void> {
    try {
      const page = await firstValueFrom(this.collectionApi.getCollections({ pageNumber: 1, pageSize: 200 }));
      this.collections.set(page.items);
    } catch {
      this.collections.set([]);
    }
  }
}

export type { SectionButtonAlign, SectionProductRotation, SectionProductSource };
