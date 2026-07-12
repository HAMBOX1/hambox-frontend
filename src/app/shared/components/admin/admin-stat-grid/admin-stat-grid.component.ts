import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-stat-grid',
  standalone: true,
  template: `<div class="admin-stat-grid"><ng-content /></div>`,
  styleUrl: './admin-stat-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStatGridComponent {}
