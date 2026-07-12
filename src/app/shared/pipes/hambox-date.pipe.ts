import { Pipe, PipeTransform, inject } from '@angular/core';

import { TranslationService } from '../../core/i18n/translation.service';

type HamboxDatePreset =
  | 'short'
  | 'medium'
  | 'long'
  | 'full'
  | 'shortDate'
  | 'mediumDate'
  | 'longDate'
  | 'fullDate'
  | 'shortTime'
  | 'mediumTime'
  | 'longTime'
  | 'fullTime';

const PRESET_OPTIONS: Record<HamboxDatePreset, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: 'short', timeStyle: 'short' },
  medium: { dateStyle: 'medium', timeStyle: 'short' },
  long: { dateStyle: 'long', timeStyle: 'short' },
  full: { dateStyle: 'full', timeStyle: 'short' },
  shortDate: { dateStyle: 'short' },
  mediumDate: { dateStyle: 'medium' },
  longDate: { dateStyle: 'long' },
  fullDate: { dateStyle: 'full' },
  shortTime: { timeStyle: 'short' },
  mediumTime: { timeStyle: 'medium' },
  longTime: { timeStyle: 'long' },
  fullTime: { timeStyle: 'full' },
};

/** Locale-aware date formatter with Angular-style preset aliases. */
@Pipe({
  name: 'hamboxDate',
  standalone: true,
  pure: false,
})
export class HamboxDatePipe implements PipeTransform {
  private readonly translation = inject(TranslationService);

  transform(
    value: Date | string | number | null | undefined,
    format?: HamboxDatePreset | Intl.DateTimeFormatOptions | string,
  ): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const locale = this.translation.currentLanguage().angularLocale;
    const options = this.resolveOptions(format);
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  private resolveOptions(
    format?: HamboxDatePreset | Intl.DateTimeFormatOptions | string,
  ): Intl.DateTimeFormatOptions {
    if (!format) {
      return { dateStyle: 'medium' };
    }

    if (typeof format === 'string') {
      if (format in PRESET_OPTIONS) {
        return PRESET_OPTIONS[format as HamboxDatePreset];
      }

      return this.legacyAngularFormat(format);
    }

    return format;
  }

  /** Maps common Angular `DatePipe` patterns to `Intl` options. */
  private legacyAngularFormat(format: string): Intl.DateTimeFormatOptions {
    const options: Intl.DateTimeFormatOptions = {};

    if (format.includes('y')) {
      options.year = format.includes('yyyy') ? 'numeric' : '2-digit';
    }
    if (format.includes('M')) {
      options.month = format.includes('MMM') && !format.includes('MMMM') ? 'short' : 'numeric';
    }
    if (format.includes('d')) {
      options.day = 'numeric';
    }
    if (format.includes('H') || format.includes('h')) {
      options.hour = 'numeric';
    }
    if (format.includes('m')) {
      options.minute = 'numeric';
    }
    if (format.includes('s')) {
      options.second = 'numeric';
    }

    return Object.keys(options).length ? options : { dateStyle: 'medium' };
  }
}
