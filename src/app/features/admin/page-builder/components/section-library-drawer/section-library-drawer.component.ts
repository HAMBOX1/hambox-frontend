import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DrawerModule } from 'primeng/drawer';

import { AdminEmptyStateComponent, AdminSearchBarComponent } from '../../../../../shared/components/admin';
import { SectionVariantDefinition } from '../../../../home/section-registry/models/section-variant.model';
import {
  groupSectionVariantsByCategory,
  SECTION_VARIANT_REGISTRY,
} from '../../../../home/section-registry/section-variant-registry';

/** Add-section picker: search + category-grouped grid over the registered section variants. */
@Component({
  selector: 'app-section-library-drawer',
  standalone: true,
  imports: [DrawerModule, TranslatePipe, AdminSearchBarComponent, AdminEmptyStateComponent],
  templateUrl: './section-library-drawer.component.html',
  styleUrl: './section-library-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionLibraryDrawerComponent {
  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  readonly variantSelected = output<SectionVariantDefinition>();

  protected readonly searchTerm = signal('');

  protected readonly groups = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filtered = term
      ? SECTION_VARIANT_REGISTRY.filter(
          (variant) =>
            variant.displayName.toLowerCase().includes(term) ||
            variant.category.toLowerCase().includes(term) ||
            variant.variantKey.toLowerCase().includes(term),
        )
      : SECTION_VARIANT_REGISTRY;

    return Array.from(groupSectionVariantsByCategory(filtered).entries());
  });

  protected select(variant: SectionVariantDefinition): void {
    this.variantSelected.emit(variant);
    this.visibleChange.emit(false);
  }
}
