import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-admin-sticky-save-bar',
  standalone: true,
  templateUrl: './admin-sticky-save-bar.component.html',
  styleUrl: './admin-sticky-save-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStickySaveBarComponent {
  readonly hint = input('');
  readonly visible = input(true);
  readonly dirty = input(false);
}
