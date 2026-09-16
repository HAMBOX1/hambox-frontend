import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import type { AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/types/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminEmptyStateComponent,
  AdminLoadingSkeletonComponent,
  AdminSearchBarComponent,
  AdminSectionCardComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { MobileViewportService } from '../../../../shared/services/mobile-viewport.service';
import { ImportConflictResolution, OptionGroupTemplateSummaryDto, ProductOptionGroupDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import { slugify } from '../../utils/product-display.utils';
import { OptionDescriptionTemplateManagerComponent } from '../option-description-template-manager/option-description-template-manager.component';
import { OptionGroupTemplateManagerComponent } from '../option-group-template-manager/option-group-template-manager.component';
import { ProductOptionGroupNodeComponent } from '../product-option-group-node/product-option-group-node.component';
import { ProductOptionMobileNavComponent } from '../product-option-mobile-nav/product-option-mobile-nav.component';

interface TemplateSelectionRow {
  readonly id: string;
  readonly label: string;
  readonly selected: boolean;
}

/**
 * Below 768px this renders `ProductOptionMobileNavComponent` (an accordion-style single-view
 * editor) instead of the desktop drag-and-drop tree — a dedicated mobile interaction, not a
 * resized copy of the desktop editor. The desktop tree markup below is untouched at any viewport
 * width.
 */
@Component({
  selector: 'app-product-option-groups-panel',
  standalone: true,
  imports: [
    FormsModule,
    AutoCompleteModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    DragDropModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminSearchBarComponent,
    OptionDescriptionTemplateManagerComponent,
    OptionGroupTemplateManagerComponent,
    ProductOptionGroupNodeComponent,
    ProductOptionMobileNavComponent,
  ],
  templateUrl: './product-option-groups-panel.component.html',
  styleUrl: './product-option-groups-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductOptionGroupsPanelComponent {
  protected readonly facade = inject(ProductEditorFacade);
  protected readonly viewport = inject(MobileViewportService);

  readonly compact = input(false);

  protected readonly permissions = PERMISSIONS;
  protected readonly optionGroups = this.facade.optionGroups;
  protected readonly loading = this.facade.loading;
  protected readonly productId = this.facade.productId;

  /** One field for both workflows: typing free text and pressing "Add Option Group" creates a
   * new group; picking a suggestion imports a saved reusable group instead. PrimeNG sets this to
   * the whole suggestion object on select, hence the union type — `createOptionGroup()` only acts
   * on the plain-string case. */
  protected readonly groupNameInput = signal<string | OptionGroupTemplateSummaryDto>('');
  protected readonly templateSuggestions = signal<readonly OptionGroupTemplateSummaryDto[]>([]);
  protected readonly creatingGroup = signal(false);
  protected readonly importingTemplate = signal(false);
  protected readonly templateManagerOpen = signal(false);

  protected readonly conflictDialogOpen = signal(false);
  protected readonly conflictTemplate = signal<OptionGroupTemplateSummaryDto | null>(null);
  protected readonly importError = signal<string | null>(null);

  // Selection-checklist step — shown between picking a saved group and actually importing it, so
  // the admin can pick just the values relevant to this product (e.g. 5 of 190 countries) instead
  // of importing everything and deleting the rest afterward.
  protected readonly selectionDialogOpen = signal(false);
  protected readonly selectionLoading = signal(false);
  protected readonly selectionTemplate = signal<OptionGroupTemplateSummaryDto | null>(null);
  protected readonly selectionOptions = signal<readonly TemplateSelectionRow[]>([]);
  protected readonly selectionSearchTerm = signal('');
  private pendingSelectedOptionIds: readonly string[] = [];

  protected readonly filteredSelectionOptions = computed(() => {
    const term = this.selectionSearchTerm().trim().toLowerCase();
    const rows = this.selectionOptions();
    return term ? rows.filter((row) => row.label.toLowerCase().includes(term)) : rows;
  });

  protected readonly selectedOptionCount = computed(
    () => this.selectionOptions().filter((row) => row.selected).length,
  );

  /** Only root groups render at the top level; nested child groups render recursively inside `app-option-group-node`. */
  protected readonly sortedRootGroups = computed(() =>
    this.optionGroups()
      .filter((group) => group.parentOptionId === null)
      .sort((left, right) => left.sortOrder - right.sortOrder),
  );

  protected async createOptionGroup(): Promise<void> {
    const raw = this.groupNameInput();
    if (typeof raw !== 'string') {
      return;
    }

    const label = raw.trim();
    const key = slugify(label);
    if (!key || !label) {
      return;
    }

    this.creatingGroup.set(true);
    try {
      await this.facade.createOptionGroup({
        key,
        displayName: label,
        sortOrder: this.sortedRootGroups().length,
        isRequired: true,
      });
      this.groupNameInput.set('');
    } finally {
      this.creatingGroup.set(false);
    }
  }

  protected async searchTemplates(event: AutoCompleteCompleteEvent): Promise<void> {
    const results = await this.facade.searchOptionGroupTemplates(event.query);
    this.templateSuggestions.set(results);
  }

  /** Picking a suggestion never imports immediately — it opens the selection checklist first
   * (`openSelectionDialog`) so the admin picks which of the template's values apply to this
   * product before anything is actually attached. */
  protected async onTemplateSelected(event: AutoCompleteSelectEvent): Promise<void> {
    const template = event.value as OptionGroupTemplateSummaryDto;
    await this.openSelectionDialog(template);
  }

  protected async openSelectionDialog(template: OptionGroupTemplateSummaryDto): Promise<void> {
    this.selectionTemplate.set(template);
    this.selectionSearchTerm.set('');
    this.selectionOptions.set([]);
    this.importError.set(null);
    this.selectionDialogOpen.set(true);
    this.selectionLoading.set(true);
    try {
      const full = await this.facade.getOptionGroupTemplate(template.id);
      this.selectionOptions.set(
        (full?.options ?? [])
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((option) => ({ id: option.id, label: option.label, selected: false })),
      );
    } finally {
      this.selectionLoading.set(false);
    }
  }

  protected toggleSelectionOption(id: string): void {
    this.selectionOptions.update((rows) =>
      rows.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)),
    );
  }

  /** Selects/clears every row currently matching the search filter, not the whole list — lets the
   * admin type e.g. "Europe" then "Select all" to grab just that filtered subset. */
  protected setAllFilteredSelected(selected: boolean): void {
    const visibleIds = new Set(this.filteredSelectionOptions().map((row) => row.id));
    this.selectionOptions.update((rows) =>
      rows.map((row) => (visibleIds.has(row.id) ? { ...row, selected } : row)),
    );
  }

  protected cancelSelection(): void {
    this.selectionDialogOpen.set(false);
    this.selectionTemplate.set(null);
    this.selectionOptions.set([]);
    this.groupNameInput.set('');
  }

  protected async confirmSelection(): Promise<void> {
    const template = this.selectionTemplate();
    const selectedIds = this.selectionOptions()
      .filter((row) => row.selected)
      .map((row) => row.id);

    if (!template || selectedIds.length === 0) {
      this.importError.set('Select at least one value to import.');
      return;
    }

    this.pendingSelectedOptionIds = selectedIds;
    this.selectionDialogOpen.set(false);

    const key = slugify(template.name);
    const conflict = this.optionGroups().some((group) => group.parentOptionId === null && group.key === key);

    if (conflict) {
      this.conflictTemplate.set(template);
      this.conflictDialogOpen.set(true);
      return;
    }

    await this.importTemplate(template, 'AddSeparate');
  }

  protected async importTemplate(template: OptionGroupTemplateSummaryDto, resolution: ImportConflictResolution): Promise<void> {
    this.importingTemplate.set(true);
    this.importError.set(null);
    try {
      const success = await this.facade.importOptionGroupTemplate(template.id, resolution, this.pendingSelectedOptionIds);
      if (success) {
        this.groupNameInput.set('');
        this.conflictDialogOpen.set(false);
        this.conflictTemplate.set(null);
        this.pendingSelectedOptionIds = [];
      } else {
        // Stay open with the choice still visible — templateActionError carries the specific
        // reason (not facade.error(), which product-edit-page treats as a page-fatal failure).
        this.importError.set(this.facade.templateActionError() ?? 'Unable to import this saved group.');
      }
    } finally {
      this.importingTemplate.set(false);
    }
  }

  protected cancelConflict(): void {
    this.conflictDialogOpen.set(false);
    this.conflictTemplate.set(null);
    this.importError.set(null);
    this.groupNameInput.set('');
    this.pendingSelectedOptionIds = [];
  }

  protected async onGroupDrop(event: CdkDragDrop<readonly ProductOptionGroupDto[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const groups = [...this.sortedRootGroups()];
    moveItemInArray(groups, event.previousIndex, event.currentIndex);
    await this.facade.reorderOptionGroups(groups.map((group) => group.id));
  }
}
