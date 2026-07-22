import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminEmptyStateComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductOptionDto, ProductOptionGroupDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import { slugify } from '../../utils/product-display.utils';

@Component({
  selector: 'app-product-option-groups-panel',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    DragDropModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminIconButtonComponent,
  ],
  templateUrl: './product-option-groups-panel.component.html',
  styleUrl: './product-option-groups-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductOptionGroupsPanelComponent {
  private readonly facade = inject(ProductEditorFacade);

  readonly compact = input(false);

  protected readonly permissions = PERMISSIONS;
  protected readonly optionGroups = this.facade.optionGroups;
  protected readonly loading = this.facade.loading;

  protected readonly newGroupLabel = signal('');
  protected readonly pendingOptionByGroup = signal<Record<string, string>>({});
  protected readonly editingGroupId = signal<string | null>(null);
  protected readonly editingGroupLabel = signal('');
  protected readonly editingOptionId = signal<string | null>(null);
  protected readonly editingOptionLabel = signal('');
  protected readonly creatingGroup = signal(false);
  protected readonly saving = signal(false);

  protected readonly sortedGroups = computed(() =>
    [...this.optionGroups()].sort((left, right) => left.sortOrder - right.sortOrder),
  );

  protected pendingOption(groupId: string): string {
    return this.pendingOptionByGroup()[groupId] ?? '';
  }

  protected setPendingOption(groupId: string, value: string): void {
    this.pendingOptionByGroup.update((current) => ({ ...current, [groupId]: value }));
  }

  protected startEditGroup(group: ProductOptionGroupDto): void {
    this.editingGroupId.set(group.id);
    this.editingGroupLabel.set(group.displayName);
  }

  protected cancelEditGroup(): void {
    this.editingGroupId.set(null);
    this.editingGroupLabel.set('');
  }

  protected async saveEditGroup(group: ProductOptionGroupDto): Promise<void> {
    const label = this.editingGroupLabel().trim();
    if (!label) {
      return;
    }

    this.saving.set(true);
    try {
      await this.facade.updateOptionGroup(group.id, {
        displayName: label,
        sortOrder: group.sortOrder,
        isRequired: group.isRequired,
      });
      this.cancelEditGroup();
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteGroup(groupId: string): Promise<void> {
    this.saving.set(true);
    try {
      await this.facade.deleteOptionGroup(groupId);
    } finally {
      this.saving.set(false);
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

    this.saving.set(true);
    try {
      await this.facade.updateOption(option.id, {
        label,
        sortOrder: option.sortOrder,
      });
      this.cancelEditOption();
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteOption(optionId: string): Promise<void> {
    this.saving.set(true);
    try {
      await this.facade.deleteOption(optionId);
    } finally {
      this.saving.set(false);
    }
  }

  protected async createOptionGroup(): Promise<void> {
    const label = this.newGroupLabel().trim();
    const key = slugify(label);
    if (!key || !label) {
      return;
    }

    this.creatingGroup.set(true);
    try {
      await this.facade.createOptionGroup({
        key,
        displayName: label,
        sortOrder: this.optionGroups().length,
        isRequired: true,
      });
      this.newGroupLabel.set('');
    } finally {
      this.creatingGroup.set(false);
    }
  }

  protected async addOptionToGroup(groupId: string): Promise<void> {
    const label = this.pendingOption(groupId).trim();
    if (!label) {
      return;
    }

    const value = slugify(label);
    const group = this.optionGroups().find((item) => item.id === groupId);
    await this.facade.createOption(groupId, {
      value,
      label,
      sortOrder: group?.options.length ?? 0,
    });
    this.setPendingOption(groupId, '');
  }

  protected async onGroupDrop(event: CdkDragDrop<readonly ProductOptionGroupDto[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const groups = [...this.sortedGroups()];
    moveItemInArray(groups, event.previousIndex, event.currentIndex);
    await this.facade.reorderOptionGroups(groups.map((group) => group.id));
  }

  protected async moveOption(group: ProductOptionGroupDto, option: ProductOptionDto, direction: -1 | 1): Promise<void> {
    const options = [...group.options].sort((left, right) => left.sortOrder - right.sortOrder);
    const index = options.findIndex((item) => item.id === option.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= options.length) {
      return;
    }

    moveItemInArray(options, index, targetIndex);
    await this.facade.reorderOptions(
      group.id,
      options.map((item) => item.id),
    );
  }

  protected sortedOptions(group: ProductOptionGroupDto): readonly ProductOptionDto[] {
    return [...group.options].sort((left, right) => left.sortOrder - right.sortOrder);
  }
}
