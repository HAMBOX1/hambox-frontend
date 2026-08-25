import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-admin-stat-grid',
  standalone: true,
  template: `
    <div
      class="admin-stat-grid"
      [class.admin-stat-grid--fixed]="columns()"
      [style.grid-template-columns]="columns() ? 'repeat(' + columns() + ', 1fr)' : null"
    >
      <ng-content />
    </div>
  `,
  styleUrl: './admin-stat-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStatGridComponent {
  // Fixed column count for a page with a known card count — avoids auto-fit stranding one card alone on a trailing row.
  readonly columns = input<number | null>(null);
}
