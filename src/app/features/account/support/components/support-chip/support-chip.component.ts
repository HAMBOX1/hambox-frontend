import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { StatusTone } from '../../../../../core/support/support.model';

/** Small tone-colored pill for ticket status/priority labels — the account side has no admin-style badge component. */
@Component({
  selector: 'app-support-chip',
  standalone: true,
  imports: [TranslatePipe],
  template: `<span
    class="support-chip"
    [attr.data-tone]="color() ? 'custom' : tone()"
    [style.--chip-color]="color()"
  >{{ labelKey() | translate }}</span>`,
  styleUrl: './support-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportChipComponent {
  readonly labelKey = input.required<string>();
  readonly tone = input<StatusTone>('neutral');
  /** Optional hex color (e.g. a dynamic category/priority color from the backend) — overrides tone. */
  readonly color = input<string | null>(null);
}
