import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-auth-card',
  standalone: true,
  templateUrl: './ui-auth-card.component.html',
  styleUrl: './ui-auth-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-auth' },
})
export class UiAuthCardComponent {
  readonly eyebrow = input('');
  readonly title = input('Sign in');
  readonly subtitle = input('');
}
