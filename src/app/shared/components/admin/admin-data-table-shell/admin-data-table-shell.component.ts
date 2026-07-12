import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-data-table-shell',
  standalone: true,
  template: `<div class="admin-data-table-shell"><ng-content /></div>`,
  styleUrl: './admin-data-table-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDataTableShellComponent {}
