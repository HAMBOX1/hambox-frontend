import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { SliderModule } from 'primeng/slider';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import { TranslationService } from '../../../../../core/i18n/translation.service';
import { UiColorPickerComponent } from '../../../../../shared/components/ui/ui-color-picker/ui-color-picker.component';
import { SettingsFieldConfig, SettingsFieldOption } from '../../models/platform-settings.model';

let nextFieldId = 0;

@Component({
  selector: 'app-settings-field',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    AutoCompleteModule,
    InputNumberModule,
    InputTextModule,
    MultiSelectModule,
    RadioButtonModule,
    SelectModule,
    SliderModule,
    TextareaModule,
    ToggleSwitchModule,
    TooltipModule,
    UiColorPickerComponent,
  ],
  templateUrl: './settings-field.component.html',
  styleUrl: './settings-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsFieldComponent {
  readonly field = input.required<SettingsFieldConfig>();
  readonly value = input<unknown>(null);
  readonly disabled = input(false);
  /** Already-resolved translation key for the active validation error, or null. */
  readonly error = input<string | null>(null);
  readonly errorParams = input<Record<string, unknown> | undefined>(undefined);
  /** Resolves dynamic `options: 'roles' | 'themes' | 'timezones'` markers — the page owns loading those lists. */
  readonly resolvedOptions = input<SettingsFieldOption[] | null>(null);

  readonly valueChange = output<unknown>();

  protected readonly fieldId = `settings-field-${++nextFieldId}`;
  protected readonly timezoneSuggestions = signal<string[]>([]);

  private readonly translate = inject(TranslateService);
  private readonly translationService = inject(TranslationService);

  protected readonly options = computed<SettingsFieldOption[]>(() => {
    this.translationService.revision(); // re-run on language switch — instant() below is otherwise not reactive
    const configured = this.field().options;
    const list = Array.isArray(configured) ? configured : (this.resolvedOptions() ?? []);
    return Array.isArray(configured)
      ? list.map((option) => ({ ...option, label: this.translate.instant(option.label) }))
      : list;
  });

  protected readonly scaledValue = computed<number | null>(() => {
    const raw = this.value();
    const scale = this.field().scale;
    if (typeof raw !== 'number') {
      return null;
    }
    return scale ? Math.round((raw / scale) * 100) / 100 : raw;
  });

  /** Deduped defensively — some backend default payloads currently return array-typed fields (e.g. supportedCurrencies) with each entry repeated; not a frontend bug, but the UI shouldn't display or round-trip duplicates it can trivially avoid. */
  protected readonly multiselectValue = computed<string[]>(() => {
    const raw = this.value();
    return Array.isArray(raw) ? Array.from(new Set(raw as string[])) : [];
  });

  protected emit(value: unknown): void {
    this.valueChange.emit(value);
  }

  protected emitScaled(value: number | null): void {
    const scale = this.field().scale;
    if (value === null) {
      this.emit(null);
      return;
    }
    this.emit(scale ? Math.round(value * scale) : value);
  }

  protected filterTimezones(event: { query: string }): void {
    const query = event.query.toLowerCase();
    const source =
      typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
        ? (Intl as unknown as { supportedValuesOf(key: string): string[] }).supportedValuesOf('timeZone')
        : ['UTC'];
    this.timezoneSuggestions.set(
      query ? source.filter((zone) => zone.toLowerCase().includes(query)).slice(0, 50) : source.slice(0, 50),
    );
  }

  protected tooltipText(): string {
    const key = this.field().tooltipKey;
    return key ? this.translate.instant(key) : '';
  }
}
