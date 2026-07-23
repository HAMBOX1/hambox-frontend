import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { AdminActionMenuComponent, AdminConfirmDialogComponent } from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductOptionDto, ProductOptionGroupDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import { slugify } from '../../utils/product-display.utils';

/**
 * One Option Group card for the mobile editor. Stays in a single scrollable view (no separate
 * screens): tapping an Option expands a tinted, indented panel in place, recursing into this same
 * component for its follow-up option group(s) — an accordion, not a drill-down navigator. Row actions
 * (Edit/Delete/Move) sit behind one overflow menu per row so full-size touch targets never wrap.
 */
@Component({
  selector: 'app-option-mobile-group-card',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    HasPermissionDirective,
    AdminActionMenuComponent,
    AdminConfirmDialogComponent,
    ProductOptionMobileGroupCardComponent,
  ],
  templateUrl: './product-option-mobile-group-card.component.html',
  styleUrl: './product-option-mobile-group-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductOptionMobileGroupCardComponent {
  private readonly facade = inject(ProductEditorFacade);

  readonly group = input.required<ProductOptionGroupDto>();
  readonly allGroups = input.required<readonly ProductOptionGroupDto[]>();
  /** Only true for root option groups, where sibling option groups can be reordered (matches desktop). */
  readonly canReorderGroup = input(false);

  readonly moveGroup = output<-1 | 1>();

  protected readonly permissions = PERMISSIONS;

  protected readonly editingGroup = signal(false);
  protected readonly editingGroupLabel = signal('');
  protected readonly editingGroupRequired = signal(true);
  protected readonly savingGroup = signal(false);

  protected readonly editingOptionId = signal<string | null>(null);
  protected readonly editingOptionLabel = signal('');
  protected readonly savingOption = signal(false);

  protected readonly pendingOption = signal('');

  protected readonly expandedOptionIds = signal<ReadonlySet<string>>(new Set());

  protected readonly creatingFollowupFor = signal<string | null>(null);
  protected readonly newFollowupLabel = signal('');
  protected readonly newFollowupRequired = signal(true);
  protected readonly creatingFollowup = signal(false);
  protected readonly deleteDialogOpen = signal(false);

  protected sortedOptions(): readonly ProductOptionDto[] {
    return [...this.group().options].sort((left, right) => left.sortOrder - right.sortOrder);
  }

  protected childGroupsForOption(optionId: string): readonly ProductOptionGroupDto[] {
    return this.allGroups()
      .filter((candidate) => candidate.parentOptionId === optionId)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  protected isExpanded(optionId: string): boolean {
    return this.expandedOptionIds().has(optionId);
  }

  protected toggleExpanded(optionId: string): void {
    this.expandedOptionIds.update((current) => {
      const next = new Set(current);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }
      return next;
    });
  }

  protected groupMenuItems(): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Edit option group', icon: 'pi pi-pencil', command: () => this.startEditGroup() },
    ];
    if (this.canReorderGroup()) {
      items.push(
        { label: 'Move up', icon: 'pi pi-arrow-up', command: () => this.moveGroup.emit(-1) },
        { label: 'Move down', icon: 'pi pi-arrow-down', command: () => this.moveGroup.emit(1) },
      );
    }
    items.push({ label: 'Delete option group', icon: 'pi pi-trash', command: () => this.requestDeleteGroup() });
    return items;
  }

  protected optionMenuItems(option: ProductOptionDto): MenuItem[] {
    return [
      { label: 'Edit option', icon: 'pi pi-pencil', command: () => this.startEditOption(option) },
      { label: 'Move up', icon: 'pi pi-arrow-up', command: () => this.moveOption(option, -1) },
      { label: 'Move down', icon: 'pi pi-arrow-down', command: () => this.moveOption(option, 1) },
      { label: 'Delete option', icon: 'pi pi-trash', command: () => this.deleteOption(option.id) },
    ];
  }

  protected startEditGroup(): void {
    this.editingGroup.set(true);
    this.editingGroupLabel.set(this.group().displayName);
    this.editingGroupRequired.set(this.group().isRequired);
  }

  protected cancelEditGroup(): void {
    this.editingGroup.set(false);
    this.editingGroupLabel.set('');
  }

  protected async saveEditGroup(): Promise<void> {
    const label = this.editingGroupLabel().trim();
    if (!label) {
      return;
    }

    this.savingGroup.set(true);
    try {
      await this.facade.updateOptionGroup(this.group().id, {
        displayName: label,
        sortOrder: this.group().sortOrder,
        isRequired: this.editingGroupRequired(),
      });
      this.cancelEditGroup();
    } finally {
      this.savingGroup.set(false);
    }
  }

  protected requestDeleteGroup(): void {
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDeleteGroup(): Promise<void> {
    this.savingGroup.set(true);
    try {
      await this.facade.deleteOptionGroup(this.group().id, true);
      this.deleteDialogOpen.set(false);
    } finally {
      this.savingGroup.set(false);
    }
  }

  protected startEditOption(option: ProductOptionDto): void {
    this.editingOptionId.set(option.id);
    this.editingOptionLabel.set(option.label);
  }

  protected cancelEditOption(): void {
    this.editingOptionId.set(null);
    this.editingOptionLabel.set('');
  }

  protected async saveEditOption(option: ProductOptionDto): Promise<void> {
    const label = this.editingOptionLabel().trim();
    if (!label) {
      return;
    }

    this.savingOption.set(true);
    try {
      await this.facade.updateOption(option.id, {
        label,
        sortOrder: option.sortOrder,
      });
      this.cancelEditOption();
    } finally {
      this.savingOption.set(false);
    }
  }

  protected async deleteOption(optionId: string): Promise<void> {
    this.savingOption.set(true);
    try {
      await this.facade.deleteOption(optionId);
    } finally {
      this.savingOption.set(false);
    }
  }

  protected async moveOption(option: ProductOptionDto, direction: -1 | 1): Promise<void> {
    const options = this.sortedOptions().slice();
    const index = options.findIndex((item) => item.id === option.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= options.length) {
      return;
    }

    const [moved] = options.splice(index, 1);
    options.splice(targetIndex, 0, moved);
    await this.facade.reorderOptions(
      this.group().id,
      options.map((item) => item.id),
    );
  }

  protected async addOption(): Promise<void> {
    const label = this.pendingOption().trim();
    if (!label) {
      return;
    }

    const value = slugify(label);
    await this.facade.createOption(this.group().id, {
      value,
      label,
      sortOrder: this.group().options.length,
    });
    this.pendingOption.set('');
  }

  protected startAddFollowup(optionId: string): void {
    this.creatingFollowupFor.set(optionId);
    this.newFollowupLabel.set('');
    this.newFollowupRequired.set(true);
  }

  protected cancelAddFollowup(): void {
    this.creatingFollowupFor.set(null);
    this.newFollowupLabel.set('');
  }

  protected async createFollowup(optionId: string): Promise<void> {
    const label = this.newFollowupLabel().trim();
    const key = slugify(label);
    if (!key || !label) {
      return;
    }

    this.creatingFollowup.set(true);
    try {
      await this.facade.createOptionGroup({
        key,
        displayName: label,
        sortOrder: this.childGroupsForOption(optionId).length,
        isRequired: this.newFollowupRequired(),
        parentOptionId: optionId,
      });
      this.cancelAddFollowup();
    } finally {
      this.creatingFollowup.set(false);
    }
  }
}
