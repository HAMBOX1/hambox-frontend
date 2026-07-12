import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-toolbar',
  standalone: true,
  templateUrl: './admin-toolbar.component.html',
  styleUrl: './admin-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminToolbarComponent {}
