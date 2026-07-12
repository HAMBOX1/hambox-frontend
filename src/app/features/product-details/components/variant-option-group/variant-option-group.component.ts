import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface VariantOptionChip {
  readonly id: string;
  readonly label: string;
  readonly disabled: boolean;
}

@Component({
  selector: 'app-variant-option-group',
  standalone: true,
  templateUrl: './variant-option-group.component.html',
  styleUrl: './variant-option-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantOptionGroupComponent {
  readonly groupLabel = input.required<string>();
  readonly options = input.required<readonly VariantOptionChip[]>();
  readonly selectedId = input<string>('');

  readonly optionSelected = output<string>();

  protected selectOption(option: VariantOptionChip): void {
    if (option.disabled || option.id === this.selectedId()) {
      return;
    }

    this.optionSelected.emit(option.id);
  }
}
