import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { AdminEmptyStateComponent } from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductOptionGroupDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import { slugify } from '../../utils/product-display.utils';
import { ProductOptionMobileGroupCardComponent } from '../product-option-mobile-group-card/product-option-mobile-group-card.component';

/**
 * Mobile editor for Questions/Answers — a single scrollable view, not a separate desktop tree
 * copy. `ProductOptionGroupsPanelComponent` renders this instead of the desktop tree below 768px;
 * the desktop tree itself is untouched at any viewport width. Root Questions render as cards here;
 * follow-up Questions expand in place inside `ProductOptionMobileGroupCardComponent` (an accordion)
 * rather than navigating to another screen.
 */
@Component({
  selector: 'app-option-mobile-nav',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    HasPermissionDirective,
    AdminEmptyStateComponent,
    ProductOptionMobileGroupCardComponent,
  ],
  templateUrl: './product-option-mobile-nav.component.html',
  styleUrl: './product-option-mobile-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductOptionMobileNavComponent {
  private readonly facade = inject(ProductEditorFacade);

  readonly allGroups = input.required<readonly ProductOptionGroupDto[]>();

  protected readonly permissions = PERMISSIONS;
  protected readonly productId = this.facade.productId;

  protected readonly newGroupLabel = signal('');
  protected readonly creatingGroup = signal(false);

  protected readonly rootGroups = computed(() =>
    this.allGroups()
      .filter((group) => group.parentOptionId === null)
      .sort((left, right) => left.sortOrder - right.sortOrder),
  );

  protected async moveGroup(group: ProductOptionGroupDto, direction: -1 | 1): Promise<void> {
    const groups = this.rootGroups().slice();
    const index = groups.findIndex((item) => item.id === group.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= groups.length) {
      return;
    }

    const [moved] = groups.splice(index, 1);
    groups.splice(targetIndex, 0, moved);
    await this.facade.reorderOptionGroups(groups.map((item) => item.id));
  }

  protected async addGroup(): Promise<void> {
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
        sortOrder: this.rootGroups().length,
        isRequired: true,
      });
      this.newGroupLabel.set('');
    } finally {
      this.creatingGroup.set(false);
    }
  }
}
