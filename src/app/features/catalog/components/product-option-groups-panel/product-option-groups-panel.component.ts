import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminEmptyStateComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { MobileViewportService } from '../../../../shared/services/mobile-viewport.service';
import { ProductOptionGroupDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import { slugify } from '../../utils/product-display.utils';
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
    ButtonModule,
    InputTextModule,
    DragDropModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    ProductOptionGroupNodeComponent,
    ProductOptionMobileNavComponent,
  ],
  templateUrl: './product-option-groups-panel.component.html',
  styleUrl: './product-option-groups-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductOptionGroupsPanelComponent {
  private readonly facade = inject(ProductEditorFacade);
  protected readonly viewport = inject(MobileViewportService);

  readonly compact = input(false);

  protected readonly permissions = PERMISSIONS;
  protected readonly optionGroups = this.facade.optionGroups;
  protected readonly loading = this.facade.loading;
  protected readonly productId = this.facade.productId;

  protected readonly newGroupLabel = signal('');
  protected readonly creatingGroup = signal(false);

  /** Only root groups render at the top level; nested child groups render recursively inside `app-option-group-node`. */
  protected readonly sortedRootGroups = computed(() =>
    this.optionGroups()
      .filter((group) => group.parentOptionId === null)
      .sort((left, right) => left.sortOrder - right.sortOrder),
  );

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
        sortOrder: this.sortedRootGroups().length,
        isRequired: true,
      });
      this.newGroupLabel.set('');
    } finally {
      this.creatingGroup.set(false);
    }
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
