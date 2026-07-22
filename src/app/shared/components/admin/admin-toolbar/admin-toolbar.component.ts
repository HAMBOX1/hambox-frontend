import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-admin-toolbar',
  standalone: true,
  templateUrl: './admin-toolbar.component.html',
  styleUrl: './admin-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminToolbarComponent {
  /** Keeps search + filters on one row on mobile instead of stacking. Opt-in so existing multi-filter toolbars keep their current mobile layout. */
  readonly compact = input(false);
}
