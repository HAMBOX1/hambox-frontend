import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../core/permissions/permission.service';
import { AdminActionMenuComponent, AdminConfirmDialogComponent, AdminIconButtonComponent } from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { LongPressDirective } from '../../../../shared/directives/long-press.directive';
import { OptionDescriptionTemplateDto, ProductOptionDto, ProductOptionGroupDto } from '../../models/inventory-api.model';
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
    AutoCompleteModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    EditorModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    HasPermissionDirective,
    LongPressDirective,
    AdminActionMenuComponent,
    AdminConfirmDialogComponent,
    AdminIconButtonComponent,
    ProductOptionMobileGroupCardComponent,
  ],
  templateUrl: './product-option-mobile-group-card.component.html',
  styleUrl: './product-option-mobile-group-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductOptionMobileGroupCardComponent {
  private readonly facade = inject(ProductEditorFacade);
  private readonly permissionService = inject(PermissionService);
  private suppressToggleClick = false;

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

  protected readonly instructionsOptionId = signal<string | null>(null);
  protected readonly instructionsDraft = signal('');
  protected readonly savingInstructions = signal(false);

  protected readonly descriptionTemplateQuery = signal<string | OptionDescriptionTemplateDto>('');
  protected readonly descriptionTemplateSuggestions = signal<readonly OptionDescriptionTemplateDto[]>([]);

  protected readonly saveDescriptionDialogOpen = signal(false);
  protected readonly saveDescriptionName = signal('');
  protected readonly savingDescriptionTemplate = signal(false);
  protected readonly saveDescriptionError = signal<string | null>(null);

  protected readonly groupInstructionsOpen = signal(false);
  protected readonly groupInstructionsDraft = signal('');
  protected readonly savingGroupInstructions = signal(false);

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
    if (this.suppressToggleClick) {
      this.suppressToggleClick = false;
      return;
    }

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

  private canEdit(): boolean {
    return (
      this.permissionService.isOwner() ||
      this.permissionService.hasPermission(this.permissions.Catalog.Inventory.Edit)
    );
  }

  protected onGroupLongPress(): void {
    if (this.canEdit() && !this.editingGroup()) {
      this.startEditGroup();
    }
  }

  protected onOptionLongPress(option: ProductOptionDto): void {
    if (this.canEdit() && this.editingOptionId() !== option.id) {
      this.suppressToggleClick = true;
      this.startEditOption(option);
    }
  }

  protected groupMenuItems(): MenuItem[] {
    const items: MenuItem[] = [
      {
        label: this.group().descriptionHtml ? 'Edit group instructions' : 'Add group instructions',
        icon: 'pi pi-info-circle',
        command: () => this.openGroupInstructions(),
      },
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
      {
        label: option.descriptionHtml ? 'Edit instructions' : 'Add instructions',
        icon: 'pi pi-info-circle',
        command: () => this.openInstructions(option),
      },
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
        descriptionHtml: this.group().descriptionHtml,
      });
      this.cancelEditGroup();
    } finally {
      this.savingGroup.set(false);
    }
  }

  protected openGroupInstructions(): void {
    this.groupInstructionsDraft.set(this.group().descriptionHtml ?? '');
    this.groupInstructionsOpen.set(true);
  }

  protected closeGroupInstructions(): void {
    this.groupInstructionsOpen.set(false);
    this.groupInstructionsDraft.set('');
  }

  protected async saveGroupInstructions(): Promise<void> {
    this.savingGroupInstructions.set(true);
    try {
      await this.facade.updateOptionGroup(this.group().id, {
        displayName: this.group().displayName,
        sortOrder: this.group().sortOrder,
        isRequired: this.group().isRequired,
        descriptionHtml: this.groupInstructionsDraft().trim() || null,
      });
      this.closeGroupInstructions();
    } finally {
      this.savingGroupInstructions.set(false);
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
        descriptionHtml: option.descriptionHtml,
      });
      this.cancelEditOption();
    } finally {
      this.savingOption.set(false);
    }
  }

  protected instructionsOptionLabel(): string | null {
    const optionId = this.instructionsOptionId();
    return this.group().options.find((option) => option.id === optionId)?.label ?? null;
  }

  protected openInstructions(option: ProductOptionDto): void {
    this.instructionsOptionId.set(option.id);
    this.instructionsDraft.set(option.descriptionHtml ?? '');
    this.descriptionTemplateQuery.set('');
    this.descriptionTemplateSuggestions.set([]);
  }

  protected closeInstructions(): void {
    this.instructionsOptionId.set(null);
    this.instructionsDraft.set('');
    this.descriptionTemplateQuery.set('');
  }

  protected async searchDescriptionTemplates(event: AutoCompleteCompleteEvent): Promise<void> {
    this.descriptionTemplateSuggestions.set(await this.facade.searchOptionDescriptionTemplates(event.query));
  }

  protected onDescriptionTemplateSelected(event: AutoCompleteSelectEvent): void {
    const template = event.value as OptionDescriptionTemplateDto;
    this.instructionsDraft.set(template.descriptionHtml);
    this.descriptionTemplateQuery.set('');
  }

  protected openDescriptionTemplateManager(): void {
    this.facade.openDescriptionTemplateManager();
  }

  protected openSaveDescriptionDialog(): void {
    this.saveDescriptionError.set(null);
    this.saveDescriptionName.set('');
    this.saveDescriptionDialogOpen.set(true);
  }

  protected async confirmSaveDescription(): Promise<void> {
    const name = this.saveDescriptionName().trim();
    const descriptionHtml = this.instructionsDraft().trim();
    if (!name || !descriptionHtml) {
      return;
    }

    this.savingDescriptionTemplate.set(true);
    this.saveDescriptionError.set(null);
    try {
      const success = await this.facade.createOptionDescriptionTemplate({ name, descriptionHtml });
      if (success) {
        this.saveDescriptionDialogOpen.set(false);
      } else {
        this.saveDescriptionError.set(this.facade.templateActionError() ?? 'Unable to save this description as reusable.');
      }
    } finally {
      this.savingDescriptionTemplate.set(false);
    }
  }

  protected async saveInstructions(): Promise<void> {
    const optionId = this.instructionsOptionId();
    const option = this.group().options.find((candidate) => candidate.id === optionId);
    if (!option) {
      return;
    }

    this.savingInstructions.set(true);
    try {
      await this.facade.updateOption(option.id, {
        label: option.label,
        sortOrder: option.sortOrder,
        descriptionHtml: this.instructionsDraft().trim() || null,
      });
      this.closeInstructions();
    } finally {
      this.savingInstructions.set(false);
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
