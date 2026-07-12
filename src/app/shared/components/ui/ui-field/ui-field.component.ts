import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextFieldId = 0;

@Component({
  selector: 'ui-field',
  standalone: true,
  templateUrl: './ui-field.component.html',
  styleUrl: './ui-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiFieldComponent {
  readonly label = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string | null>(null);
  readonly required = input(false);
  readonly disabled = input(false);
  readonly forId = input<string>('');

  protected readonly fieldId = `ui-field-${++nextFieldId}`;

  protected inputId(): string {
    return this.forId() || this.fieldId;
  }
}
