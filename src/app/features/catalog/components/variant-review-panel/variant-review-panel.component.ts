import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';

import { ProductOptionGroupDto, ProductVariantDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';

/** The option groups a selection still has to fill: root groups, plus a child group once its parent option is chosen. */
export function missingOptionGroups(
  groups: readonly ProductOptionGroupDto[],
  optionIds: readonly string[],
): ProductOptionGroupDto[] {
  const chosen = new Set(optionIds);
  const sorted = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const missing: ProductOptionGroupDto[] = [];

  const walk = (level: readonly ProductOptionGroupDto[]): void => {
    for (const group of level.filter((g) => g.options.length > 0)) {
      const option = group.options.find((o) => chosen.has(o.id));
      if (!option) {
        missing.push(group);
        continue;
      }
      walk(sorted.filter((g) => g.parentOptionId === option.id));
    }
  };

  walk(sorted.filter((g) => g.parentOptionId === null));
  return missing;
}

/**
 * Variants that are not a finished combination: ones missing a choice from one of the product's option groups, and ones that
 * repeat another variant's options. They are kept out of the stock list (they cannot be sold or stocked), shown here instead
 * so each can be completed (pick the missing options) or, when nothing uses it, removed. Codes, stock and orders are never
 * touched: completing keeps the variant (and everything attached to it), and removal is refused for a variant that is in use.
 */
@Component({
  selector: 'app-variant-review-panel',
  standalone: true,
  imports: [FormsModule, ButtonModule, DialogModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (problems().length > 0) {
      <section class="vr" aria-label="Variants that need fixing">
        <header class="vr__head">
          <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
          <div>
            <strong>{{ problems().length }} variant{{ problems().length === 1 ? '' : 's' }} need fixing</strong>
            <p>
              These are not finished combinations, so they cannot be sold or receive stock and are kept out of the list below.
              Complete each one (pick the missing options), or remove it if nothing uses it. Their codes, stock and orders are
              never touched.
            </p>
          </div>
        </header>

        <ul class="vr__list">
          @for (variant of problems(); track variant.id) {
            <li class="vr__row">
              <div class="vr__main">
                <strong>{{ labelOf(variant) || variant.sku }}</strong>
                <span class="vr__meta">
                  {{ variant.sku }}
                  @if (variant.isComplete === false) {
                    · missing: {{ (variant.missingGroups ?? []).join(', ') }}
                  }
                  @if (variant.duplicateOfSku) {
                    · same options as {{ variant.duplicateOfSku }}
                  }
                  · stock {{ variant.availableStock }} · {{ variant.totalCodesCount }} codes
                </span>
              </div>
              <div class="vr__actions">
                @if (variant.isComplete === false) {
                  <button pButton type="button" size="small" label="Complete" icon="pi pi-check-circle" (click)="startComplete(variant)"></button>
                }
                <button pButton type="button" size="small" severity="danger" [outlined]="true" icon="pi pi-trash" label="Remove" (click)="remove.emit(variant)"></button>
              </div>
            </li>
          }
        </ul>
      </section>
    }

    <p-dialog
      [visible]="!!target()"
      (visibleChange)="!$event && target.set(null)"
      header="Complete this variant"
      [modal]="true"
      [dismissableMask]="true"
      [draggable]="false"
      [resizable]="false"
      appendTo="body"
      [style]="{ width: 'min(30rem, 94vw)' }"
      styleClass="admin-dialog"
    >
      @if (target(); as variant) {
        <p class="vr__hint">
          <strong>{{ variant.sku }}</strong> currently has: {{ labelOf(variant) || 'no options' }}. Pick the options it is
          missing; its price, SKU, codes, stock and orders stay as they are.
        </p>

        @for (group of stillMissing(); track group.id) {
          <label class="vr__field">
            <span>{{ group.displayName }}</span>
            <p-select
              [options]="[...group.options]"
              optionLabel="label"
              optionValue="id"
              appendTo="body"
              placeholder="Choose..."
              [ngModel]="picked()[group.id] ?? null"
              (ngModelChange)="pick(group.id, $event)"
            />
          </label>
        } @empty {
          <p class="vr__hint">All groups are filled. Save to make it a complete variant.</p>
        }

        @if (error(); as message) {
          <p class="vr__error" role="alert">{{ message }}</p>
        }

        <div class="admin-dialog__actions">
          <button pButton type="button" label="Cancel" severity="secondary" (click)="target.set(null)"></button>
          <button pButton type="button" label="Save" icon="pi pi-check" [disabled]="stillMissing().length > 0 || saving()" [loading]="saving()" (click)="save()"></button>
        </div>
      }
    </p-dialog>
  `,
  styles: `
    .vr {
      margin-bottom: 1rem;
      padding: 0.9rem 1rem;
      border: 1px solid var(--admin-accent-amber, #fbbf24);
      border-radius: 12px;
      background: color-mix(in srgb, var(--admin-accent-amber, #fbbf24) 8%, transparent);
    }

    .vr__head {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .vr__head i {
      margin-top: 0.2rem;
      color: var(--admin-accent-amber, #fbbf24);
    }

    .vr__head p,
    .vr__hint {
      margin: 0.25rem 0 0;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }

    .vr__list {
      display: grid;
      gap: 0.5rem;
      margin: 0.85rem 0 0;
      padding: 0;
      list-style: none;
    }

    .vr__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--color-panel-border, rgba(128, 128, 128, 0.3));
      border-radius: 10px;
    }

    .vr__main {
      display: grid;
      gap: 0.15rem;
      min-width: 0;
    }

    .vr__meta {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      overflow-wrap: anywhere;
    }

    .vr__actions {
      display: flex;
      gap: 0.4rem;
    }

    .vr__field {
      display: grid;
      gap: 0.3rem;
      margin-top: 0.75rem;
      font-size: 0.875rem;
    }

    .vr__error {
      margin: 0.6rem 0 0;
      font-size: 0.8125rem;
      color: var(--admin-accent-red, #f87171);
    }
  `,
})
export class VariantReviewPanelComponent {
  private readonly facade = inject(ProductEditorFacade);

  readonly variants = input.required<readonly ProductVariantDto[]>();
  readonly optionGroups = input.required<readonly ProductOptionGroupDto[]>();

  /** Asks the manager to run its usage-aware removal for this variant. */
  readonly remove = output<ProductVariantDto>();

  protected readonly problems = computed(() =>
    this.variants().filter((variant) => variant.isComplete === false || !!variant.duplicateOfSku),
  );

  protected readonly target = signal<ProductVariantDto | null>(null);
  protected readonly picked = signal<Record<string, string>>({});
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly optionLabels = computed(() => {
    const map = new Map<string, string>();
    for (const group of this.optionGroups()) {
      for (const option of group.options) {
        map.set(option.id, option.label);
      }
    }
    return map;
  });

  protected readonly stillMissing = computed(() => {
    const variant = this.target();
    if (!variant) {
      return [];
    }
    return missingOptionGroups(this.optionGroups(), [...variant.optionIds, ...Object.values(this.picked())]);
  });

  protected labelOf(variant: ProductVariantDto): string {
    return variant.optionIds
      .map((id) => this.optionLabels().get(id))
      .filter((label): label is string => !!label)
      .join(' · ');
  }

  protected startComplete(variant: ProductVariantDto): void {
    this.picked.set({});
    this.error.set(null);
    this.target.set(variant);
  }

  protected pick(groupId: string, optionId: string | null): void {
    this.picked.update((current) => {
      const next = { ...current };
      if (optionId) {
        next[groupId] = optionId;
      } else {
        delete next[groupId];
      }
      return next;
    });
  }

  protected async save(): Promise<void> {
    const variant = this.target();
    if (!variant || this.saving() || this.stillMissing().length > 0) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const ok = await this.facade.updateVariant(variant.id, {
      sku: variant.sku,
      planId: variant.planId,
      priceOverride: variant.priceOverride,
      comparePrice: variant.comparePrice,
      costPrice: variant.costPrice,
      memberPrice: variant.memberPrice,
      sortOrder: variant.sortOrder,
      status: variant.status,
      isVisible: variant.isVisible,
      membershipPlanId: variant.membershipPlanId,
      lowStockThreshold: variant.lowStockThreshold,
      optionIds: [...variant.optionIds, ...Object.values(this.picked())],
    });
    this.saving.set(false);
    if (ok) {
      this.target.set(null);
    } else {
      this.error.set(this.facade.error() ?? 'Could not save. Another variant may already have exactly these options.');
    }
  }
}
