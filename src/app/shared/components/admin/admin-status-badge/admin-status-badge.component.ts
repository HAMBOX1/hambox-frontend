import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TagModule } from 'primeng/tag';

export type AdminStatusTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

@Component({
  selector: 'app-admin-status-badge',
  standalone: true,
  imports: [TagModule],
  templateUrl: './admin-status-badge.component.html',
  styleUrl: './admin-status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStatusBadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<AdminStatusTone>('neutral');
  readonly outlined = input(false);
}
