import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiError } from '../../../../core/models/api-error.model';
import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../core/permissions/permission.service';
import { PromotionListItemDto } from '../../../admin/promotions/models/promotion-api.model';
import { ProductPromoService, PromoApplyResult } from '../../services/product-promo.service';

export interface PromoCategoryOption {
  readonly id: string;
  readonly label: string;
}

type PromoMode = 'existing' | 'new';
type PromoScope = 'products' | 'category';

const CODE_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;

/**
 * "Add promo code" for one product, and "Apply promo code" for a selection (or a whole category). The admin picks a promo
 * code that already exists or types a new one; the products are attached to it in one step, so there is no need to open
 * Promotions and search the product list there.
 */
@Component({
  selector: 'app-product-promo-dialog',
  standalone: true,
  imports: [TranslatePipe, FormsModule, ButtonModule, DialogModule, SelectModule],
  templateUrl: './product-promo-dialog.component.html',
  styleUrl: './product-promo-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPromoDialogComponent {
  private readonly promoService = inject(ProductPromoService);
  private readonly permissionService = inject(PermissionService);

  readonly open = input(false);
  /** The product's name when the dialog is for a single product; null for a selection. */
  readonly productName = input<string | null>(null);
  readonly productCount = input(0);
  /** Resolves the product ids at apply time (a selection can be "everything matching the filter"). */
  readonly resolveProductIds = input<() => Promise<readonly string[]>>(async () => []);
  /** Offers "a whole category" as the target — only for the bulk version. */
  readonly categories = input<readonly PromoCategoryOption[] | null>(null);

  readonly closed = output<void>();
  readonly applied = output<{ readonly message: string }>();

  protected readonly canCreate = computed(() => this.permissionService.hasPermission(PERMISSIONS.Promotions.Create));
  private readonly canPublish = computed(() => this.permissionService.hasPermission(PERMISSIONS.Promotions.Publish));

  protected readonly mode = signal<PromoMode>('existing');
  protected readonly scope = signal<PromoScope>('products');
  protected readonly promotions = signal<readonly PromotionListItemDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly promotionId = signal<string | null>(null);
  protected readonly categoryId = signal<string | null>(null);
  protected readonly newCode = signal('');
  protected readonly newType = signal<'Percentage' | 'FixedAmount'>('Percentage');
  protected readonly newValue = signal<number | null>(null);

  protected readonly typeOptions = [
    { label: '%', value: 'Percentage' as const },
    { label: '$', value: 'FixedAmount' as const },
  ];

  protected readonly promotionOptions = computed(() =>
    this.promotions().map((promotion) => ({
      label: `${promotion.name} — ${promotion.discountType === 'Percentage' ? `${promotion.discountValue}%` : `$${promotion.discountValue}`}${promotion.status === 'Active' ? '' : ` (${promotion.status})`}`,
      value: promotion.id,
    })),
  );

  /** A mutable copy for the select (the input is readonly). */
  protected readonly categoryChoices = computed(() => [...(this.categories() ?? [])]);
  protected readonly canChooseCategory = computed(() => this.categoryChoices().length > 0);

  protected readonly canApply = computed(() => {
    if (this.saving()) {
      return false;
    }
    if (this.scope() === 'category' && !this.categoryId()) {
      return false;
    }
    if (this.mode() === 'existing') {
      return !!this.promotionId();
    }
    const value = this.newValue();
    const validValue = value !== null && value > 0 && (this.newType() === 'FixedAmount' || value <= 100);
    return CODE_PATTERN.test(this.newCode().trim()) && validValue;
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.reset();
        void this.loadPromotions();
      }
    });
  }

  protected setMode(mode: PromoMode): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  protected async apply(): Promise<void> {
    if (!this.canApply()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      const wholeCategory = this.scope() === 'category';
      const productIds = wholeCategory ? [] : await this.resolveProductIds()();
      if (!wholeCategory && productIds.length === 0) {
        this.error.set('No products are selected.');
        return;
      }

      const targets = { productIds, categoryIds: wholeCategory && this.categoryId() ? [this.categoryId() as string] : [] };
      let result: PromoApplyResult;
      let code: string;
      if (this.mode() === 'existing') {
        const promotionId = this.promotionId() as string;
        result = await this.promoService.addTargets(promotionId, targets);
        code = this.promotions().find((promotion) => promotion.id === promotionId)?.name ?? '';
      } else {
        code = this.newCode().trim().toUpperCase();
        result = await this.promoService.createCode(
          { code, discountType: this.newType(), discountValue: this.newValue() as number },
          targets,
          this.canPublish(),
        );
      }

      this.applied.emit({ message: this.summary(result, code, wholeCategory) });
    } catch (error) {
      this.error.set(error instanceof ApiError && error.message ? error.message : 'Could not apply the promo code. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  private summary(result: PromoApplyResult, code: string, wholeCategory: boolean): string {
    const label = code ? `“${code}”` : 'The promo code';
    if (wholeCategory) {
      return `${label} now applies to the whole category.`;
    }
    const added = result.productsAdded;
    const skipped = result.alreadyTargeted;
    const created = this.mode() === 'new' && !this.canPublish() ? ' It was created as a draft — publish it in Promotions to turn it on.' : '';
    return `${label} applied to ${added} product${added === 1 ? '' : 's'}${skipped ? ` (${skipped} already had it)` : ''}.${created}`;
  }

  private reset(): void {
    this.mode.set('existing');
    this.scope.set('products');
    this.promotionId.set(null);
    this.categoryId.set(null);
    this.newCode.set('');
    this.newType.set('Percentage');
    this.newValue.set(null);
    this.error.set(null);
  }

  private async loadPromotions(): Promise<void> {
    this.loading.set(true);
    try {
      this.promotions.set(await this.promoService.listCodePromotions());
      if (this.promotions().length === 0 && this.canCreate()) {
        this.mode.set('new');
      }
    } catch {
      this.promotions.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
