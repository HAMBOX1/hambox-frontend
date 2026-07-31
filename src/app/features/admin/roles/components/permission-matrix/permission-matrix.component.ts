import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import {
  AdminEmptyStateComponent,
  AdminLoadingSkeletonComponent,
  AdminSearchBarComponent,
} from '../../../../../shared/components/admin';
import { MobileViewportService } from '../../../../../shared/services/mobile-viewport.service';
import { PermissionApiDto, PermissionGroupApiDto } from '../../models/role-api.model';

interface ModuleSummary {
  readonly module: string;
  readonly total: number;
  readonly granted: number;
}

interface ModuleSearchMatch {
  readonly module: string;
  readonly permissions: readonly PermissionApiDto[];
}

const SEARCH_ALL_MIN_LENGTH = 2;

/** Module-first permission editor: one module's permissions render at a time (left nav picks
 * the module, center shows only that module's flat permission list), never the whole catalog
 * at once. Replaces the old always-render-every-group layout entirely. */
@Component({
  selector: 'app-permission-matrix',
  standalone: true,
  imports: [TranslatePipe, AdminSearchBarComponent, AdminEmptyStateComponent, AdminLoadingSkeletonComponent],
  templateUrl: './permission-matrix.component.html',
  styleUrl: './permission-matrix.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionMatrixComponent {
  protected readonly mobileViewport = inject(MobileViewportService);

  readonly groups = input.required<readonly PermissionGroupApiDto[]>();
  readonly modules = input.required<readonly string[]>();
  readonly selectedIds = input.required<readonly string[]>();
  readonly loading = input(false);
  readonly disabled = input(false);

  readonly permissionToggle = output<{ permissionId: string; selected: boolean }>();
  readonly selectAllRequested = output<readonly string[]>();
  readonly clearAllRequested = output<readonly string[]>();
  readonly invertRequested = output<readonly string[]>();

  protected readonly activeModule = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly searchAllModules = signal(false);
  /** Mobile only: false = showing the module list, true = showing the active module's panel
   * full-screen (same "one screen at a time" pattern already used elsewhere in admin, e.g. the
   * support tickets page). Desktop shows both columns at once regardless of this value. */
  protected readonly mobileShowingPanel = signal(false);

  private readonly selectedIdSet = computed(() => new Set(this.selectedIds()));

  protected readonly moduleSummaries = computed<readonly ModuleSummary[]>(() => {
    const selected = this.selectedIdSet();
    const counts = new Map<string, { total: number; granted: number }>();

    for (const group of this.groups()) {
      const entry = counts.get(group.module) ?? { total: 0, granted: 0 };
      entry.total += group.permissions.length;
      entry.granted += group.permissions.filter((p) => selected.has(p.id)).length;
      counts.set(group.module, entry);
    }

    return this.modules().map((module) => {
      const entry = counts.get(module) ?? { total: 0, granted: 0 };
      return { module, total: entry.total, granted: entry.granted };
    });
  });

  /** Flattened across every group in the module — the UI shows one continuous list per module,
   * not sub-sectioned by the original catalog group, per the redesigned interaction model. */
  protected readonly activeModulePermissions = computed<readonly PermissionApiDto[]>(() => {
    const module = this.activeModule();
    if (!module) {
      return [];
    }

    return [...this.groups()]
      .filter((g) => g.module === module)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((g) => g.permissions);
  });

  protected readonly activeModuleTotal = computed(() => this.activeModulePermissions().length);

  protected readonly activeModuleGranted = computed(() => {
    const selected = this.selectedIdSet();
    return this.activeModulePermissions().filter((p) => selected.has(p.id)).length;
  });

  protected readonly visiblePermissions = computed<readonly PermissionApiDto[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const permissions = this.activeModulePermissions();
    return term ? permissions.filter((p) => this.matchesTerm(p, term)) : permissions;
  });

  /** Only populated once `searchAllModules` is on AND a term is typed — never a bare dump of
   * every permission, even in the cross-module search path. */
  protected readonly searchAllResults = computed<readonly ModuleSearchMatch[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!this.searchAllModules() || term.length < SEARCH_ALL_MIN_LENGTH) {
      return [];
    }

    const byModule = new Map<string, PermissionApiDto[]>();
    for (const group of [...this.groups()].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const matches = group.permissions.filter((p) => this.matchesTerm(p, term));
      if (matches.length === 0) {
        continue;
      }
      const bucket = byModule.get(group.module) ?? [];
      bucket.push(...matches);
      byModule.set(group.module, bucket);
    }

    return [...byModule.entries()].map(([module, permissions]) => ({ module, permissions }));
  });

  protected readonly showSearchAllPrompt = computed(
    () => this.searchAllModules() && this.searchTerm().trim().length < SEARCH_ALL_MIN_LENGTH,
  );

  constructor() {
    // Auto-select the first module once the matrix loads, and re-anchor if the active module
    // ever stops existing in the current module list (defensive; modules are effectively static).
    effect(() => {
      const modules = this.modules();
      const active = this.activeModule();
      if (modules.length > 0 && (active === null || !modules.includes(active))) {
        this.activeModule.set(modules[0]);
      }
    });
  }

  protected selectModule(module: string): void {
    this.activeModule.set(module);
    this.searchTerm.set('');
    this.searchAllModules.set(false);
    this.mobileShowingPanel.set(true);
  }

  protected backToModuleList(): void {
    this.mobileShowingPanel.set(false);
  }

  protected isSelected(permissionId: string): boolean {
    return this.selectedIdSet().has(permissionId);
  }

  protected onPermissionChange(permissionId: string, selected: boolean): void {
    this.permissionToggle.emit({ permissionId, selected });
  }

  protected onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  protected toggleSearchAllModules(): void {
    this.searchAllModules.update((value) => !value);
  }

  protected selectAll(): void {
    this.selectAllRequested.emit(this.activeModulePermissions().map((p) => p.id));
  }

  protected clearAll(): void {
    this.clearAllRequested.emit(this.activeModulePermissions().map((p) => p.id));
  }

  protected invertSelection(): void {
    this.invertRequested.emit(this.activeModulePermissions().map((p) => p.id));
  }

  private matchesTerm(permission: PermissionApiDto, term: string): boolean {
    return (
      permission.name.toLowerCase().includes(term) ||
      (permission.description?.toLowerCase().includes(term) ?? false)
    );
  }
}
