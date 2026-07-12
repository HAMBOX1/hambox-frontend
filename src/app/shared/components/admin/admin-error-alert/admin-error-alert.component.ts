import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-admin-error-alert',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './admin-error-alert.component.html',
  styleUrl: './admin-error-alert.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminErrorAlertComponent {
  readonly message = input.required<string>();
  readonly retryLabel = input('Retry');
  /** When false, hides the retry button even if (retry) is bound. */
  readonly showRetry = input(true);
  readonly retry = output<void>();
}
