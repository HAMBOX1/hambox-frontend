import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import {
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
} from '../../../../shared/components/admin';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import { isVariantLive } from '../../utils/variant-status.utils';

interface HealthCheck {
  readonly id: string;
  readonly label: string;
  readonly passed: boolean;
  readonly warning?: string;
}

@Component({
  selector: 'app-product-health-panel',
  standalone: true,
  imports: [AdminSectionCardComponent, AdminStatusBadgeComponent],
  templateUrl: './product-health-panel.component.html',
  styleUrl: './product-health-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductHealthPanelComponent {
  private readonly facade = inject(ProductEditorFacade);

  protected readonly product = this.facade.product;
  protected readonly images = this.facade.images;
  protected readonly variants = this.facade.variants;
  protected readonly optionGroups = this.facade.optionGroups;
  protected readonly statistics = this.facade.statistics;

  protected readonly checks = computed<readonly HealthCheck[]>(() => {
    const product = this.product();
    const images = this.images();
    const variants = this.variants();
    const optionGroups = this.optionGroups();
    const stats = this.statistics();

    if (!product) {
      return [];
    }

    const hasBasicInfo =
      Boolean(product.nameEn?.trim())
      && Boolean(product.nameAr?.trim())
      && Boolean(product.descriptionEn?.trim())
      && Boolean(product.descriptionAr?.trim())
      && Boolean(product.categoryId);

    const hasImages = images.length > 0;
    const hasPricing = product.price > 0;
    const hasVariants = variants.length > 0;
    const requiresVariants = optionGroups.length > 0;
    const activeVisibleVariants = variants.filter(isVariantLive);
    const variantCoverageOk = !requiresVariants || activeVisibleVariants.length > 0;

    const availableStock = stats?.available ?? 0;
    const lowStockVariants = stats?.lowStockVariants ?? 0;
    const outOfStockVariants = stats?.outOfStockVariants ?? 0;
    const hasInventory = availableStock > 0;

    const isPublished = product.status === 'Active';
    const seoConfigured = false;

    const list: HealthCheck[] = [
      { id: 'basic', label: 'Basic information', passed: hasBasicInfo },
      { id: 'images', label: 'Product images', passed: hasImages, warning: hasImages ? undefined : 'Add at least one gallery image.' },
      { id: 'category', label: 'Category assigned', passed: Boolean(product.categoryId) },
      { id: 'pricing', label: 'Pricing configured', passed: hasPricing },
      {
        id: 'variants',
        label: 'Variants configured',
        passed: variantCoverageOk,
        warning: requiresVariants && !hasVariants ? 'Create variants for each option combination.' : undefined,
      },
      {
        id: 'inventory',
        label: 'Inventory available',
        passed: hasInventory,
        warning: !hasInventory ? 'Import codes or add stock before publishing.' : undefined,
      },
      {
        id: 'publishing',
        label: 'Published on storefront',
        passed: isPublished,
        warning: !isPublished ? 'Product is not active yet.' : undefined,
      },
      {
        id: 'seo',
        label: 'SEO metadata',
        passed: seoConfigured,
        warning: 'SEO fields are not available in the catalog API yet.',
      },
      {
        id: 'visibility',
        label: 'Storefront visibility',
        passed: isPublished && (!requiresVariants || activeVisibleVariants.length > 0),
        warning: requiresVariants && activeVisibleVariants.length === 0 ? 'Activate and show at least one variant.' : undefined,
      },
    ];

    if (lowStockVariants > 0) {
      list.push({
        id: 'low-stock',
        label: 'Low stock warning',
        passed: false,
        warning: `${lowStockVariants} variant(s) are below the low-stock threshold.`,
      });
    }

    if (outOfStockVariants > 0) {
      list.push({
        id: 'out-of-stock',
        label: 'Out of stock warning',
        passed: false,
        warning: `${outOfStockVariants} variant(s) have no available codes.`,
      });
    }

    return list;
  });

  protected readonly score = computed(() => {
    const checks = this.checks().filter((check) => !check.id.endsWith('-stock'));
    if (!checks.length) {
      return 0;
    }

    const passed = checks.filter((check) => check.passed).length;
    return Math.round((passed / checks.length) * 100);
  });

  protected readonly warnings = computed(() =>
    this.checks().filter((check) => !check.passed && check.warning).map((check) => check.warning!),
  );

  protected scoreTone(score: number): 'success' | 'warning' | 'info' | 'neutral' {
    if (score >= 85) {
      return 'success';
    }

    if (score >= 60) {
      return 'warning';
    }

    return 'info';
  }
}
