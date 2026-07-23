import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Thin progress meter for long-running admin operations (catalog import/export, bulk jobs). */
@Component({
  selector: 'app-admin-progress-bar',
  standalone: true,
  templateUrl: './admin-progress-bar.component.html',
  styleUrl: './admin-progress-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProgressBarComponent {
  readonly percent = input(0);
  readonly label = input<string>('');
  readonly indeterminate = input(false);

  protected readonly clampedPercent = computed(() => Math.max(0, Math.min(100, this.percent())));
}
