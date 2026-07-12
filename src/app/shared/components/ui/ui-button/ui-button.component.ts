import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

export type UiButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type UiButtonSize = 'md' | 'sm';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './ui-button.component.html',
  styleUrl: './ui-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
  class: 'ui-button-host',
  '[class.ui-button-host--full]': 'fullWidth()',
},
})
export class UiButtonComponent {
  readonly label = input('');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly variant = input<UiButtonVariant>('primary');
  readonly size = input<UiButtonSize>('md');
  readonly icon = input<string>('');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly fullWidth = input(false);

  readonly clicked = output<MouseEvent>();

  protected severity(): 'primary' | 'secondary' | 'danger' | undefined {
    if (this.variant() === 'danger') {
      return 'danger';
    }
    if (this.variant() === 'secondary' || this.variant() === 'ghost') {
      return 'secondary';
    }
    return 'primary';
  }

  protected text(): boolean {
    return this.variant() === 'ghost';
  }

  protected onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
