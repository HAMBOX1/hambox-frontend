import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

let nextInputId = 0;

@Component({
  selector: 'ui-input',
  standalone: true,
  imports: [InputTextModule],
  templateUrl: './ui-input.component.html',
  styleUrl: './ui-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiInputComponent),
      multi: true,
    },
  ],
})
export class UiInputComponent implements ControlValueAccessor {
  readonly inputId = input<string>('');
  readonly type = input<'text' | 'email' | 'search' | 'tel' | 'url'>('text');
  readonly placeholder = input('');
  readonly autocomplete = input<string | undefined>(undefined);
  readonly inputmode = input<string | undefined>(undefined);

  protected readonly resolvedId = `ui-input-${++nextInputId}`;
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

  protected onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.onChange(next);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
