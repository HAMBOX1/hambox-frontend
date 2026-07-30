import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';

import { RoutePickerComponent } from '../route-picker/route-picker.component';

let nextId = 0;

/**
 * Groups a button's label + destination into one card instead of two unrelated flat fields
 * (`primaryButtonText` / `primaryButtonUrl` and siblings across most section configs). Binds
 * directly to those two existing flat keys via `label`/`url` in/out pairs — no config-shape change,
 * just a friendlier editing surface over the same data.
 */
@Component({
  selector: 'app-button-editor',
  standalone: true,
  imports: [FormsModule, TranslatePipe, InputTextModule, RoutePickerComponent],
  templateUrl: './button-editor.component.html',
  styleUrl: './button-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonEditorComponent {
  readonly title = input.required<string>();
  readonly label = input<string | null>(null);
  readonly url = input<string | null>(null);
  readonly disabled = input(false);

  readonly labelChange = output<string>();
  readonly urlChange = output<string | null>();

  protected readonly fieldId = `button-editor-${++nextId}`;

  /** A destination with no visible label renders an empty, unclickable-looking button on the storefront. */
  protected readonly incomplete = computed(() => !!this.url() && !this.label()?.trim());

  protected setLabel(value: string): void {
    this.labelChange.emit(value);
  }

  protected setUrl(value: string | null): void {
    this.urlChange.emit(value);
  }
}
