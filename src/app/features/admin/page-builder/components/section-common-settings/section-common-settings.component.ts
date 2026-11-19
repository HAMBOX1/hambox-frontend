import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MediaPickerComponent } from '../../../../../shared/components/admin/media-picker/media-picker.component';
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
  imports: [FormsModule, ButtonEditorComponent, CategoryPickerComponent, MediaPickerComponent, ProductPickerComponent],
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

      <div class="common__row">
        <label for="common-text-size">Text size (px)</label>
        <input
          id="common-text-size"
          type="number"
          min="0"
          max="64"
          step="1"
          [disabled]="disabled()"
          [ngModel]="config().textFontSize ?? 0"
          (ngModelChange)="patch({ textFontSize: $event > 0 ? $event : null })"
        />
        <small>The section's descriptions and paragraphs. 0 keeps the default size.</small>
      </div>

      <div class="common__row">
        <label for="common-text-color">Text colour</label>
        <div class="common__color">
          <input
            id="common-text-color"
            type="color"
            [disabled]="disabled()"
            [ngModel]="config().textColor ?? '#ffffff'"
            (ngModelChange)="patch({ textColor: $event })"
          />
          <button type="button" class="common__link" [disabled]="disabled() || !config().textColor" (click)="patch({ textColor: null })">
            Reset
          </button>
        </div>
      </div>

      <div class="common__row">
        <label for="common-font">Font</label>
        <select id="common-font" [disabled]="disabled()" [ngModel]="config().fontFamily" (ngModelChange)="patch({ fontFamily: $event })">
          <option value="default">Default (the section's own)</option>
          <option value="heading">The store's heading font</option>
          <option value="body">The store's body font</option>
        </select>
      </div>

      <app-button-editor
        title="Button of this section"
        [label]="config().buttonLabel"
        [url]="config().buttonUrl"
        [disabled]="disabled()"
        (labelChange)="patch({ buttonLabel: $event || null })"
        (urlChange)="patch({ buttonUrl: $event || null })"
      />

      <div class="common__row">
        <span class="common__label">Button picture (optional)</span>
        <app-media-picker
          [value]="config().buttonImageUrl"
          [disabled]="disabled()"
          recommendedSize="A picture of the whole button, e.g. 360x120px, PNG or WebP"
          (valueChange)="patch({ buttonImageUrl: $event || null })"
        />
        <small>When set, the picture is the button (it needs a destination above; the label is its accessible name).</small>
      </div>

      <div class="common__row">
        <label for="common-button-above">Text above the button (optional)</label>
        <input
          id="common-button-above"
          type="text"
          maxlength="200"
          [disabled]="disabled()"
          [ngModel]="config().buttonTextAbove ?? ''"
          (ngModelChange)="patch({ buttonTextAbove: $event || null })"
        />
      </div>

      <div class="common__row">
        <label for="common-button-below">Text below the button (optional)</label>
        <input
          id="common-button-below"
          type="text"
          maxlength="200"
          [disabled]="disabled()"
          [ngModel]="config().buttonTextBelow ?? ''"
          (ngModelChange)="patch({ buttonTextBelow: $event || null })"
        />
      </div>

      @if (config().buttonLabel && config().buttonUrl) {
        <div class="common__row">
          <label for="common-button-align">Button position</label>
          <select
            id="common-button-align"
            [disabled]="disabled()"
            [ngModel]="config().buttonAlign"
            (ngModelChange)="patch({ buttonAlign: $event })"
          >
            <option [ngValue]="null">Automatic</option>
            <option value="start">Start</option>
            <option value="center">Centre</option>
            <option value="end">End</option>
          </select>
        </div>

        <div class="common__row">
          <label for="common-button-placement">Button place</label>
          <select
            id="common-button-placement"
            [disabled]="disabled()"
            [ngModel]="config().buttonPlacement"
            (ngModelChange)="patch({ buttonPlacement: $event })"
          >
            <option value="text">Under the section's heading text</option>
            <option value="inside">Inside the section, after its content</option>
            <option value="bottom">After the section (below it)</option>
          </select>
        </div>

        <div class="common__row">
          <label for="common-button-size">Button size</label>
          <select
            id="common-button-size"
            [disabled]="disabled()"
            [ngModel]="config().buttonSize"
            (ngModelChange)="patch({ buttonSize: $event })"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large (same as the hero buttons)</option>
          </select>
        </div>

        <div class="common__row">
          <label for="common-button-font-size">Button text size (px)</label>
          <input
            id="common-button-font-size"
            type="number"
            min="0"
            max="48"
            step="1"
            [disabled]="disabled()"
            [ngModel]="config().buttonFontSize ?? 0"
            (ngModelChange)="patch({ buttonFontSize: $event > 0 ? $event : null })"
          />
          <small>0 keeps the size that goes with the chosen button size.</small>
        </div>

        <div class="common__row">
          <label for="common-button-color">Button colour</label>
          <div class="common__color">
            <input
              id="common-button-color"
              type="color"
              [disabled]="disabled()"
              [ngModel]="config().buttonColor ?? '#3cdc96'"
              (ngModelChange)="patch({ buttonColor: $event })"
            />
            <button type="button" class="common__link" [disabled]="disabled() || !config().buttonColor" (click)="patch({ buttonColor: null })">
              Reset
            </button>
          </div>
        </div>

        <div class="common__row">
          <label for="common-button-text-color">Button text colour</label>
          <div class="common__color">
            <input
              id="common-button-text-color"
              type="color"
              [disabled]="disabled()"
              [ngModel]="config().buttonTextColor ?? '#07130d'"
              (ngModelChange)="patch({ buttonTextColor: $event })"
            />
            <button type="button" class="common__link" [disabled]="disabled() || !config().buttonTextColor" (click)="patch({ buttonTextColor: null })">
              Reset
            </button>
          </div>
        </div>

        <div class="common__row">
          <label for="common-button-style">Button style</label>
          <select
            id="common-button-style"
            [disabled]="disabled()"
            [ngModel]="config().buttonStyle"
            (ngModelChange)="patch({ buttonStyle: $event })"
          >
            <option value="filled">Filled</option>
            <option value="outline">Outline only</option>
            <option value="soft">Soft tint</option>
          </select>
        </div>

        <div class="common__row">
          <label for="common-button-shape">Button corners</label>
          <select
            id="common-button-shape"
            [disabled]="disabled()"
            [ngModel]="config().buttonShape"
            (ngModelChange)="patch({ buttonShape: $event })"
          >
            <option value="auto">Automatic (follows the size)</option>
            <option value="pill">Fully round (pill)</option>
            <option value="rounded">Rounded corners</option>
            <option value="square">Almost square</option>
          </select>
        </div>

        <div class="common__row">
          <label for="common-button-spacing">Distance from the section</label>
          <select
            id="common-button-spacing"
            [disabled]="disabled()"
            [ngModel]="config().buttonSpacing"
            (ngModelChange)="patch({ buttonSpacing: $event })"
          >
            <option value="close">Close to the section</option>
            <option value="normal">Normal spacing</option>
          </select>
          <small>Only used when the button is at the bottom of the section.</small>
        </div>
      }

      @if (showProducts()) {
        <h4 class="common__title">Cards shown</h4>

        <div class="common__row">
          <label for="common-source">Show</label>
          <select id="common-source" [disabled]="disabled()" [ngModel]="products().source" (ngModelChange)="patchProducts({ source: $event })">
            <option value="auto">Default featured products (e.g. only the ones on sale)</option>
            <option value="all">All products of the store</option>
            <option value="manual">Products I choose</option>
            <option value="category">A category</option>
            <option value="internal">An internal category</option>
            <option value="categories">Categories instead of products</option>
          </select>
        </div>

        @switch (products().source) {
          @case ('manual') {
            <app-product-picker [value]="products().productIds" [disabled]="disabled()" (valueChange)="patchProducts({ productIds: $event })" />
          }
          @case ('category') {
            <app-category-picker [value]="products().categoryIds" [disabled]="disabled()" (valueChange)="patchProducts({ categoryIds: $event })" />
          }
          @case ('categories') {
            <app-category-picker [value]="products().categoryIds" [disabled]="disabled()" (valueChange)="patchProducts({ categoryIds: $event })" />
            <small>Pick the categories to show as cards (in this order). Leave empty to show all active categories.</small>
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

        @if (products().source === 'auto') {
          <small>"Default featured" can only show as many products as the page features by default (for example the ones on sale). To show more, choose "All products of the store".</small>
        }

        @if (products().source !== 'manual' && (products().source !== 'categories' || products().categoryIds.length === 0)) {
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

    .common__row label,
    .common__label {
      font-weight: 600;
      font-size: 0.85rem;
    }

    .common__row small {
      color: var(--admin-text-secondary);
    }

    .common__row input[type='number'],
    .common__row input[type='text'],
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
