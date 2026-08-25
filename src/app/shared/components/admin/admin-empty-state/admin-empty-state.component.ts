import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-admin-empty-state',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './admin-empty-state.component.html',
  styleUrl: './admin-empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEmptyStateComponent {
  readonly icon = input('pi pi-inbox');
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly primaryLabel = input<string | null>(null);
  readonly primaryIcon = input<string | null>(null);
  readonly secondaryLabel = input<string | null>(null);
  readonly compact = input(false);
  /** A single-row, flat, icon-inline treatment — for spots where even `compact` still reads as a
   * large container whose only job is holding a message (e.g. a status/summary panel that must
   * stay visually dense even when there's nothing to show). No gradient, no big icon circle. */
  readonly dense = input(false);
  /** Icon color for the dense variant only — lets a "0 alerts / all clear" state read as
   * genuinely healthy (green) rather than the same neutral gray as "no data available yet". */
  readonly tone = input<'neutral' | 'success'>('neutral');

  readonly primaryAction = output<void>();
  readonly secondaryAction = output<void>();
}
