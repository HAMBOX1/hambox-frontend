import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface VariantOptionChip {
  readonly id: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly descriptionHtml?: string | null;
}

export interface VariantOptionInstructionsRequest {
  readonly groupLabel: string;
  readonly optionLabel: string;
  readonly descriptionHtml: string;
}

@Component({
  selector: 'app-variant-option-group',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './variant-option-group.component.html',
  styleUrl: './variant-option-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantOptionGroupComponent {
  readonly groupLabel = input.required<string>();
  readonly options = input.required<readonly VariantOptionChip[]>();
  readonly selectedId = input<string>('');

  readonly optionSelected = output<string>();
  /** Purely informational — never touches selection/variant-resolution state. */
  readonly instructionsRequested = output<VariantOptionInstructionsRequest>();

  /** Only the currently selected value's instructions surface, so the page never shows a wall of
   * text under every option — one compact link per group, if any. */
  protected readonly selectedOption = computed(() =>
    this.options().find((option) => option.id === this.selectedId()),
  );

  protected selectOption(option: VariantOptionChip): void {
    if (option.disabled || option.id === this.selectedId()) {
      return;
    }

    this.optionSelected.emit(option.id);
  }

  protected openInstructions(): void {
    const option = this.selectedOption();
    if (!option?.descriptionHtml) {
      return;
    }

    this.instructionsRequested.emit({
      groupLabel: this.groupLabel(),
      optionLabel: option.label,
      descriptionHtml: option.descriptionHtml,
    });
  }
}
