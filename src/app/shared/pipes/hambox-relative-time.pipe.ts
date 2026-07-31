import { Pipe, PipeTransform, inject } from '@angular/core';

import { TranslationService } from '../../core/i18n/translation.service';

const UNITS: readonly { readonly unit: Intl.RelativeTimeFormatUnit; readonly seconds: number }[] = [
  { unit: 'year', seconds: 31_536_000 },
  { unit: 'month', seconds: 2_592_000 },
  { unit: 'week', seconds: 604_800 },
  { unit: 'day', seconds: 86_400 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
];

/** Locale-aware "2 days ago" / "منذ يومين" formatting via the native Intl API — no plugin needed. */
@Pipe({
  name: 'hamboxRelativeTime',
  standalone: true,
  pure: false,
})
export class HamboxRelativeTimePipe implements PipeTransform {
  private readonly translation = inject(TranslationService);

  transform(value: Date | string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const locale = this.translation.currentLanguage().angularLocale;
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const diffSeconds = (date.getTime() - Date.now()) / 1000;

    for (const { unit, seconds } of UNITS) {
      if (Math.abs(diffSeconds) >= seconds) {
        return formatter.format(Math.round(diffSeconds / seconds), unit);
      }
    }

    return formatter.format(Math.round(diffSeconds), 'second');
  }
}
