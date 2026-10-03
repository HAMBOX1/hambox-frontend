import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { AdminPageHeaderComponent } from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionPipe } from '../../../../shared/pipes/has-permission.pipe';
import {
  AvailableFilterGroup,
  CategoryFilterConfig,
  CategoryFilterItem,
  CategoryTreeItem,
} from '../../models/category.model';
import { CategoryApiService } from '../../services/category-api.service';

/** The all-zero id addresses the store-wide default list on the backend. */
const DEFAULT_LIST_ID = '00000000-0000-0000-0000-000000000000';

interface CategoryRow {
  readonly id: string;
  readonly name: string;
  readonly depth: number;
}

/**
 * Admin editor for the storefront filter lists: pick a category (or the store-wide default), then choose which
 * filters customers see there, in what order and under what names. Categories without their own list inherit
 * their parent's, then the default.
 */
@Component({
  selector: 'app-storefront-filters-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    HasPermissionPipe,
    AdminPageHeaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './storefront-filters-page.component.html',
  styleUrl: './storefront-filters-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontFiltersPageComponent implements OnInit {
  private readonly categoryApi = inject(CategoryApiService);
  private readonly messages = inject(MessageService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Storefront Filters' });
  protected readonly defaultListId = DEFAULT_LIST_ID;

  protected readonly rows = signal<readonly CategoryRow[]>([]);
  protected readonly selectedId = signal<string>(DEFAULT_LIST_ID);
  protected readonly config = signal<CategoryFilterConfig | null>(null);
  protected readonly items = signal<readonly CategoryFilterItem[]>([]);
  protected readonly dirty = signal(false);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly addKey = signal<string | null>(null);

  protected readonly selectedName = computed(() => {
    const id = this.selectedId();
    return id === DEFAULT_LIST_ID ? 'Default (all categories)' : (this.rows().find((r) => r.id === id)?.name ?? '');
  });

  protected readonly available = computed<readonly AvailableFilterGroup[]>(() => {
    const listed = new Set(this.items().map((i) => i.groupKey));
    return (this.config()?.availableGroups ?? []).filter((g) => !listed.has(g.groupKey));
  });

  protected readonly sourceNote = computed(() => {
    const cfg = this.config();
    if (!cfg) {
      return '';
    }

    if (cfg.hasOwnList) {
      return 'This category has its own filter list.';
    }

    if (cfg.inheritedFromCategoryId) {
      const parent = this.rows().find((r) => r.id === cfg.inheritedFromCategoryId)?.name ?? 'a parent category';
      return `No list of its own: it uses the list of “${parent}”. Changing anything below creates a separate list for this category.`;
    }

    if (cfg.inheritedFromDefault) {
      return 'No list of its own: it uses the store-wide default list. Changing anything below creates a separate list for this category.';
    }

    return 'Nothing is configured yet, so customers currently see every option group as a filter. Add the filters you want and save.';
  });

  ngOnInit(): void {
    void this.loadCategories().then(() => this.select(DEFAULT_LIST_ID));
  }

  protected select(id: string): void {
    this.selectedId.set(id);
    void this.loadConfig(id);
  }

  protected rename(index: number, field: 'displayNameEn' | 'displayNameAr', value: string): void {
    this.patchItem(index, { [field]: value });
  }

  protected toggleVisible(index: number, visible: boolean): void {
    this.patchItem(index, { isVisible: visible });
  }

  protected move(index: number, delta: number): void {
    const target = index + delta;
    const list = [...this.items()];
    if (target < 0 || target >= list.length) {
      return;
    }

    [list[index], list[target]] = [list[target], list[index]];
    this.items.set(list);
    this.dirty.set(true);
  }

  protected remove(index: number): void {
    this.items.set(this.items().filter((_, i) => i !== index));
    this.dirty.set(true);
  }

  protected addFilter(): void {
    const key = this.addKey();
    const group = this.available().find((g) => g.groupKey === key);
    if (!group) {
      return;
    }

    this.items.set([
      ...this.items(),
      {
        groupKey: group.groupKey,
        defaultName: group.defaultName,
        displayNameEn: null,
        displayNameAr: null,
        isVisible: true,
        productCount: group.productCount,
      },
    ]);
    this.addKey.set(null);
    this.dirty.set(true);
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.categoryApi.saveCategoryFilterConfig(
          this.selectedId(),
          this.items().map((i) => ({
            groupKey: i.groupKey,
            displayNameEn: i.displayNameEn?.trim() || null,
            displayNameAr: i.displayNameAr?.trim() || null,
            isVisible: i.isVisible,
          })),
        ),
      );
      this.messages.add({ severity: 'success', summary: 'Filters saved', life: 3000 });
      await this.loadConfig(this.selectedId());
    } catch {
      this.messages.add({ severity: 'error', summary: 'Could not save the filters', detail: 'Please try again.', life: 5000 });
    } finally {
      this.saving.set(false);
    }
  }

  protected async resetToInherited(): Promise<void> {
    this.saving.set(true);
    try {
      await firstValueFrom(this.categoryApi.resetCategoryFilterConfig(this.selectedId()));
      this.messages.add({ severity: 'success', summary: 'List removed', detail: 'This category now inherits again.', life: 3000 });
      await this.loadConfig(this.selectedId());
    } catch {
      this.messages.add({ severity: 'error', summary: 'Could not reset the list', life: 5000 });
    } finally {
      this.saving.set(false);
    }
  }

  private patchItem(index: number, patch: Partial<CategoryFilterItem>): void {
    this.items.set(this.items().map((item, i) => (i === index ? { ...item, ...patch } : item)));
    this.dirty.set(true);
  }

  private async loadConfig(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const cfg = await firstValueFrom(this.categoryApi.getCategoryFilterConfig(id));
      if (this.selectedId() !== id) {
        return;
      }

      this.config.set(cfg);
      this.items.set(cfg.items);
      this.dirty.set(false);
    } catch {
      this.config.set(null);
      this.items.set([]);
      this.messages.add({ severity: 'error', summary: 'Could not load the filters', life: 5000 });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const tree = await firstValueFrom(this.categoryApi.getCategoryTree());
      this.rows.set(this.flatten(tree));
    } catch {
      this.rows.set([]);
    }
  }

  /** Depth-first, siblings in their configured order, so the list reads like the category tree. */
  private flatten(tree: readonly CategoryTreeItem[]): CategoryRow[] {
    const byParent = new Map<string | null, CategoryTreeItem[]>();
    for (const item of tree) {
      const key = item.parentId ?? null;
      byParent.set(key, [...(byParent.get(key) ?? []), item]);
    }

    const out: CategoryRow[] = [];
    const walk = (parent: string | null, depth: number): void => {
      const children = (byParent.get(parent) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
      for (const child of children) {
        out.push({ id: child.id, name: child.nameEn, depth });
        walk(child.id, depth + 1);
      }
    };

    walk(null, 0);
    return out;
  }
}
