import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ColorPickerModule } from 'primeng/colorpicker';
import {
  formatHslString,
  formatRgbString,
  hsbToHex,
  isHsbColor,
  isValidHex,
  normalizeHex,
  parseColorWithAlpha,
  toColorString,
} from '../../../utils/color.util';

type ColorFormat = 'hex' | 'rgb' | 'hsl';

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperApi {
  open(): Promise<EyeDropperResult>;
}

const RECENT_COLORS_KEY = 'hambox.theme-editor.recent-colors';
const MAX_RECENT_COLORS = 12;
let nextPickerId = 0;

/** Semantic design tokens offered as one-click swatches — see `styles/themes/tokens.scss` for the source values. */
const THEME_TOKEN_VARS: readonly { name: string; cssVar: string }[] = [
  { name: 'PRIMARY', cssVar: '--color-primary' },
  { name: 'ACCENT', cssVar: '--color-accent' },
  { name: 'SUCCESS', cssVar: '--color-success' },
  { name: 'WARNING', cssVar: '--color-warning' },
  { name: 'DANGER', cssVar: '--color-danger' },
  { name: 'INFO', cssVar: '--color-info' },
];

export interface ThemeColorSwatch {
  readonly name: string;
  readonly hex: string;
}

@Component({
  selector: 'ui-color-picker',
  standalone: true,
  imports: [ColorPickerModule, FormsModule],
  templateUrl: './ui-color-picker.component.html',
  styleUrl: './ui-color-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiColorPickerComponent),
      multi: true,
    },
  ],
})
export class UiColorPickerComponent implements ControlValueAccessor {
  readonly label = input('');

  protected readonly formats: readonly ColorFormat[] = ['hex', 'rgb', 'hsl'];
  protected readonly resolvedId = `ui-color-picker-${++nextPickerId}`;
  protected readonly disabled = signal(false);
  protected readonly hex = signal('#000000');
  protected readonly alpha = signal(100);
  protected readonly format = signal<ColorFormat>('hex');
  protected readonly textValue = computed(() => this.formatFor(this.format(), this.hex()));
  protected readonly recentColors = signal<string[]>(loadRecentColors());
  protected readonly supportsEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
  /* ponytail: resolved once per component instance rather than reactively on theme toggle — this
     picker is typically opened fresh per edit session, so a stale swatch after a live theme switch
     is an acceptable gap; re-resolve on toggle if that turns out to matter in practice. */
  protected readonly themeSwatches = signal<ThemeColorSwatch[]>(resolveThemeSwatches());

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    const parsed = value ? parseColorWithAlpha(value) : null;
    if (parsed) {
      this.hex.set(parsed.hex);
      this.alpha.set(parsed.alpha);
    }
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

  protected setFormat(format: ColorFormat): void {
    this.format.set(format);
  }

  protected onPickerValueChange(value: string | object): void {
    if (typeof value === 'string' && isValidHex(value)) {
      this.commit(normalizeHex(value), this.alpha());
      return;
    }
    if (isHsbColor(value)) {
      this.commit(hsbToHex(value), this.alpha());
    }
  }

  protected onTextInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const parsed = parseColorWithAlpha(value);
    if (parsed) {
      this.commit(parsed.hex, parsed.alpha);
    }
  }

  protected onTextBlur(): void {
    this.onTouched();
  }

  protected onAlphaInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.commit(this.hex(), value);
  }

  protected applyRecent(color: string): void {
    this.commit(color, this.alpha());
  }

  protected applyThemeSwatch(swatch: ThemeColorSwatch): void {
    this.commit(swatch.hex, 100);
  }

  protected async pickWithEyeDropper(): Promise<void> {
    if (!this.supportsEyeDropper) {
      return;
    }
    try {
      const eyeDropper = new (window as unknown as { EyeDropper: new () => EyeDropperApi }).EyeDropper();
      const result = await eyeDropper.open();
      this.commit(normalizeHex(result.sRGBHex), this.alpha());
    } catch {
      // user cancelled the eyedropper — no-op
    }
  }

  private commit(hex: string, alpha: number): void {
    this.hex.set(hex);
    this.alpha.set(alpha);
    this.onChange(toColorString(hex, alpha));
    this.pushRecent(hex);
  }

  private pushRecent(hex: string): void {
    const next = [hex, ...this.recentColors().filter((c) => c !== hex)].slice(0, MAX_RECENT_COLORS);
    this.recentColors.set(next);
    saveRecentColors(next);
  }

  private formatFor(format: ColorFormat, hex: string): string {
    switch (format) {
      case 'rgb':
        return formatRgbString(hex);
      case 'hsl':
        return formatHslString(hex);
      default:
        return hex;
    }
  }
}

function resolveThemeSwatches(): ThemeColorSwatch[] {
  if (typeof document === 'undefined') {
    return [];
  }
  const styles = getComputedStyle(document.documentElement);
  const swatches: ThemeColorSwatch[] = [];
  for (const token of THEME_TOKEN_VARS) {
    const raw = styles.getPropertyValue(token.cssVar).trim();
    const parsed = raw ? parseColorWithAlpha(raw) : null;
    if (parsed) {
      swatches.push({ name: token.name, hex: parsed.hex });
    }
  }
  return swatches;
}

function loadRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentColors(colors: string[]): void {
  try {
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(colors));
  } catch {
    // storage unavailable — recent colors just won't persist
  }
}
