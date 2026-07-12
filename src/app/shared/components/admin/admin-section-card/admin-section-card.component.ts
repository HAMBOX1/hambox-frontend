import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-admin-section-card',
  standalone: true,
  templateUrl: './admin-section-card.component.html',
  styleUrl: './admin-section-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSectionCardComponent {
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly padded = input(true);
  readonly noDivider = input(false);
}
