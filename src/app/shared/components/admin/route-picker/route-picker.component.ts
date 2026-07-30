import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { TranslationService } from '../../../../core/i18n/translation.service';
import { APP_ROUTE_REGISTRY } from './route-registry';

interface RouteSelectOption {
  readonly label: string;
  readonly value: string;
}

type RoutePickerMode = 'page' | 'custom';

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
  imports: [FormsModule, TranslatePipe, ButtonModule, InputTextModule, SelectModule],
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

  private readonly translate = inject(TranslateService);
  private readonly translationService = inject(TranslationService);

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
    return APP_ROUTE_REGISTRY.some((route) => route.path === current) ? 'page' : 'custom';
  });

  protected readonly forcedMode = signal<RoutePickerMode | null>(null);
  protected readonly activeMode = computed<RoutePickerMode>(() => this.forcedMode() ?? this.mode());

  protected setMode(mode: RoutePickerMode): void {
    this.forcedMode.set(mode);
    if (mode === 'page' && this.value() && !APP_ROUTE_REGISTRY.some((r) => r.path === this.value())) {
      this.emit(null);
    }
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
