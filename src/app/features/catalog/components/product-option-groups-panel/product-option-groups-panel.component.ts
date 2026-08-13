import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import type { AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/types/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminEmptyStateComponent,
  AdminLoadingSkeletonComponent,
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
    DialogModule,
    InputTextModule,
    DragDropModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
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

  protected async onTemplateSelected(event: AutoCompleteSelectEvent): Promise<void> {
    const template = event.value as OptionGroupTemplateSummaryDto;
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
      const success = await this.facade.importOptionGroupTemplate(template.id, resolution);
      if (success) {
        this.groupNameInput.set('');
        this.conflictDialogOpen.set(false);
        this.conflictTemplate.set(null);
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
