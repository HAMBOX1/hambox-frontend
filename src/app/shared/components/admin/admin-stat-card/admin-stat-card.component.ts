import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-admin-stat-card',
  standalone: true,
  templateUrl: './admin-stat-card.component.html',
  styleUrl: './admin-stat-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly tone = input<'default' | 'success' | 'info' | 'warning'>('default');
  readonly compact = input(false);
}
