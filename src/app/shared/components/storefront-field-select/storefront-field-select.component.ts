import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface StorefrontSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-storefront-field-select',
  standalone: true,
  templateUrl: './storefront-field-select.component.html',
  styleUrl: './storefront-field-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontFieldSelectComponent {
  label = input.required<string>();
  options = input.required<readonly StorefrontSelectOption[]>();
  selectId = input.required<string>();
  value = model.required<string>();

  protected onSelect(event: Event): void {
    this.value.set((event.target as HTMLSelectElement).value);
  }
}
