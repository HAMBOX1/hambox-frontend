import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

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
  /** Tighter header/body padding for dense, high-frequency-edit surfaces (e.g. product editor). Opt-in, does not affect existing usages. */
  readonly compact = input(false);

  /** When true, the header shows a chevron and the body can be toggled. Collapsed state is caller-owned via two-way binding so it persists across the editing session. */
  readonly collapsible = input(false);
  readonly collapsed = model(false);

  protected toggle(): void {
    if (this.collapsible()) {
      this.collapsed.update((value) => !value);
    }
  }
}
