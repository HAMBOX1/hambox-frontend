import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';

import { TranslationService } from '../../../../core/i18n/translation.service';
import { Product } from '../../../../features/catalog/models/product.model';
import { ProductApiService } from '../../../../features/catalog/services/product-api.service';
import { APP_ROUTE_REGISTRY } from './route-registry';

interface RouteSelectOption {
  readonly label: string;
  readonly value: string;
}

type RoutePickerMode = 'page' | 'product' | 'custom';

const PRODUCT_LINK_PATTERN = /^\/products\/(.+)$/;

const RECENT_ROUTES_KEY = 'hambox.route-picker.recent';
const MAX_RECENT_ROUTES = 8;
let nextId = 0;

/**
 * Searchable picker over `APP_ROUTE_REGISTRY` for internal navigation fields (button/link `*Url`
 * properties), with a "Custom link" fallback for external URLs or paths the registry doesn't cover
 * (Discord invites, campaign landing pages, etc). Reusable anywhere a link needs picking, not just
 * the Page Builder.
 */
@Component({
  selector: 'app-route-picker',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ButtonModule, InputTextModule, SelectModule, AutoCompleteModule],
  templateUrl: './route-picker.component.html',
  styleUrl: './route-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutePickerComponent {
  readonly value = input<string | null>(null);
  readonly disabled = input(false);
  readonly placeholder = input('/products');

  readonly valueChange = output<string | null>();

  protected readonly fieldId = `route-picker-${++nextId}`;
  protected readonly recentRoutes = signal<string[]>(loadRecent());
  protected readonly productSuggestions = signal<Product[]>([]);
  protected readonly selectedProduct = signal<Product | null>(null);

  private readonly translate = inject(TranslateService);
  private readonly translationService = inject(TranslationService);
  private readonly productApi = inject(ProductApiService);

  protected readonly options = computed<RouteSelectOption[]>(() => {
    this.translationService.revision();
    return APP_ROUTE_REGISTRY.map((route) => ({
      label: `${this.translate.instant(route.labelKey)} — ${this.translate.instant(`ADMIN.PICKERS.ROUTE_PICKER.GROUPS.${route.group}`)}`,
      value: route.path,
    }));
  });

  protected readonly mode = computed<RoutePickerMode>(() => {
    const current = this.value();
    if (!current) {
      return 'page';
    }
    if (APP_ROUTE_REGISTRY.some((route) => route.path === current)) {
      return 'page';
    }
    return PRODUCT_LINK_PATTERN.test(current) ? 'product' : 'custom';
  });

  protected readonly forcedMode = signal<RoutePickerMode | null>(null);
  protected readonly activeMode = computed<RoutePickerMode>(() => this.forcedMode() ?? this.mode());

  constructor() {
    effect(() => {
      const match = this.value()?.match(PRODUCT_LINK_PATTERN);
      const productId = match?.[1] ?? null;
      if (!productId) {
        this.selectedProduct.set(null);
        return;
      }
      if (this.selectedProduct()?.id === productId) {
        return;
      }
      firstValueFrom(this.productApi.getProductById(productId))
        .then((product) => this.selectedProduct.set(product))
        .catch(() => this.selectedProduct.set(null));
    });
  }

  protected setMode(mode: RoutePickerMode): void {
    this.forcedMode.set(mode);
    if (mode !== this.mode() && this.value()) {
      this.emit(null);
    }
  }

  protected async searchProducts(event: AutoCompleteCompleteEvent): Promise<void> {
    const result = await firstValueFrom(
      this.productApi.getProducts({ pageNumber: 1, pageSize: 20, searchTerm: event.query }),
    );
    this.productSuggestions.set([...result.items]);
  }

  protected selectProduct(product: Product): void {
    this.selectedProduct.set(product);
    this.emit(`/products/${product.id}`);
  }

  protected emit(value: string | null): void {
    this.valueChange.emit(value || null);
    if (value) {
      this.pushRecent(value);
    }
  }

  protected applyRecent(path: string): void {
    this.emit(path);
  }

  protected recentLabel(path: string): string {
    const known = APP_ROUTE_REGISTRY.find((route) => route.path === path);
    return known ? this.translate.instant(known.labelKey) : path;
  }

  private pushRecent(path: string): void {
    const next = [path, ...this.recentRoutes().filter((p) => p !== path)].slice(0, MAX_RECENT_ROUTES);
    this.recentRoutes.set(next);
    try {
      localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — recent routes just won't persist
    }
  }
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_ROUTES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
