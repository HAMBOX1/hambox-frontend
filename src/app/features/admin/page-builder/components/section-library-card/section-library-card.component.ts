import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { AdminStatusBadgeComponent } from '../../../../../shared/components/admin';
import { placeholderImage } from '../../../../home/section-registry/preview/section-preview-data';
import { SectionVariantDefinition } from '../../../../home/section-registry/models/section-variant.model';

/**
 * Fast-preview card for the Section Library grid: static thumbnail (never mounts the real Angular
 * component), name, description, category badge, and an optional popular/new badge. Hover reveals a
 * Quick Add button; double-click (or Quick Add) inserts immediately, a plain click opens the full
 * preview dialog.
 *
 * Structural note: the "open preview" affordance, the favorite toggle, and Quick Add are three
 * sibling `<button>`s (see the template) rather than buttons nested inside a `role="button"`
 * container — nested interactive controls are invalid ARIA and cause native `keydown` events on an
 * inner button to bubble into an outer click/keydown handler, double-firing both actions. Keeping
 * them as siblings, layered purely with CSS (`pointer-events`/absolute positioning), means each
 * button's native Enter/Space handling only ever triggers that one button's own output.
 */
@Component({
  selector: 'app-section-library-card',
  standalone: true,
  imports: [TranslatePipe, AdminStatusBadgeComponent],
  templateUrl: './section-library-card.component.html',
  styleUrl: './section-library-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionLibraryCardComponent {
  readonly variant = input.required<SectionVariantDefinition>();
  readonly favorited = input(false);

  readonly preview = output<void>();
  readonly quickAdd = output<void>();
  readonly favoriteToggle = output<void>();

  protected readonly thumbnail = computed(
    () => this.variant().previewImage ?? placeholderImage(this.variant().displayName),
  );
}
