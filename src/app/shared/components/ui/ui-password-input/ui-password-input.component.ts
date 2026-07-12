import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { PasswordModule } from 'primeng/password';

let nextPasswordId = 0;

@Component({
  selector: 'ui-password-input',
  standalone: true,
  imports: [FormsModule, PasswordModule],
  templateUrl: './ui-password-input.component.html',
  styleUrl: './ui-password-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiPasswordInputComponent),
      multi: true,
    },
  ],
})
export class UiPasswordInputComponent implements ControlValueAccessor {
  readonly inputId = input<string>('');
  readonly placeholder = input('');

  protected readonly resolvedId = `ui-password-${++nextPasswordId}`;
  protected readonly disabled = signal(false);
  protected readonly value = signal('');

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected id(): string {
    return this.inputId() || this.resolvedId;
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onValueChange(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
