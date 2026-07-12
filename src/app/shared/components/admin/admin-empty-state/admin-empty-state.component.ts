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

  readonly primaryAction = output<void>();
  readonly secondaryAction = output<void>();
}
