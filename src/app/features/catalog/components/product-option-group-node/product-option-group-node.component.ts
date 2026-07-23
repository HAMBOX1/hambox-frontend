import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { AdminIconButtonComponent } from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductOptionDto, ProductOptionGroupDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import { slugify } from '../../utils/product-display.utils';

/**
 * Recursive node: renders one Option Group as a card, its Options as rows, and — for any option
 * that owns nested follow-up option groups (e.g. Xbox -> Account Type) — recurses into
 * `app-option-group-node` again inside a tinted, indented panel.
 */
@Component({
  selector: 'app-option-group-node',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    DragDropModule,
    HasPermissionDirective,
    AdminIconButtonComponent,
    ProductOptionGroupNodeComponent,
  ],
  templateUrl: './product-option-group-node.component.html',
  styleUrl: './product-option-group-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductOptionGroupNodeComponent {
  private readonly facade = inject(ProductEditorFacade);

  readonly group = input.required<ProductOptionGroupDto>();
  readonly allGroups = input.required<readonly ProductOptionGroupDto[]>();
  readonly depth = input(0);

  protected readonly permissions = PERMISSIONS;

  protected readonly editingGroup = signal(false);
  protected readonly editingGroupLabel = signal('');
  protected readonly editingGroupRequired = signal(true);
  protected readonly editingOptionId = signal<string | null>(null);
  protected readonly editingOptionLabel = signal('');
  protected readonly pendingOption = signal('');
  protected readonly creatingChildGroupForOption = signal<string | null>(null);
  protected readonly newChildGroupLabel = signal('');
  protected readonly newChildGroupRequired = signal(true);
  protected readonly saving = signal(false);
  protected readonly creatingChildGroup = signal(false);
  protected readonly collapsed = signal(false);
  protected readonly collapsedFollowUps = signal<ReadonlySet<string>>(new Set());

  protected toggleCollapse(): void {
    this.collapsed.update((value) => !value);
  }

  protected toggleFollowUps(optionId: string): void {
    this.collapsedFollowUps.update((current) => {
      const next = new Set(current);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }
      return next;
    });
  }

  protected sortedOptions(): readonly ProductOptionDto[] {
    return [...this.group().options].sort((left, right) => left.sortOrder - right.sortOrder);
  }

  protected childGroupsForOption(optionId: string): readonly ProductOptionGroupDto[] {
    return this.allGroups()
      .filter((candidate) => candidate.parentOptionId === optionId)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  protected hasFollowUps(optionId: string): boolean {
    return this.childGroupsForOption(optionId).length > 0;
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

    this.saving.set(true);
    try {
      await this.facade.updateOptionGroup(this.group().id, {
        displayName: label,
        sortOrder: this.group().sortOrder,
        isRequired: this.editingGroupRequired(),
      });
      this.cancelEditGroup();
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteGroup(): Promise<void> {
    this.saving.set(true);
    try {
      await this.facade.deleteOptionGroup(this.group().id);
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

  protected async onOptionDrop(event: CdkDragDrop<readonly ProductOptionDto[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const options = this.sortedOptions().slice();
    moveItemInArray(options, event.previousIndex, event.currentIndex);
    await this.facade.reorderOptions(
      this.group().id,
      options.map((item) => item.id),
    );
  }

  protected startAddChildGroup(optionId: string): void {
    this.creatingChildGroupForOption.set(optionId);
    this.newChildGroupLabel.set('');
    this.newChildGroupRequired.set(true);
  }

  protected cancelAddChildGroup(): void {
    this.creatingChildGroupForOption.set(null);
    this.newChildGroupLabel.set('');
  }

  protected async createChildGroup(optionId: string): Promise<void> {
    const label = this.newChildGroupLabel().trim();
    const key = slugify(label);
    if (!key || !label) {
      return;
    }

    this.creatingChildGroup.set(true);
    try {
      await this.facade.createOptionGroup({
        key,
        displayName: label,
        sortOrder: this.childGroupsForOption(optionId).length,
        isRequired: this.newChildGroupRequired(),
        parentOptionId: optionId,
      });
      this.cancelAddChildGroup();
    } finally {
      this.creatingChildGroup.set(false);
    }
  }
}
