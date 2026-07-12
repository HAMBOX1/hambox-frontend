import { Pipe, PipeTransform, inject } from '@angular/core';

import { TranslationService } from '../../core/i18n/translation.service';

/** Relative or absolute date for admin tables. */
@Pipe({
  name: 'hamboxRelativeDate',
  standalone: true,
  pure: false,
})
export class HamboxRelativeDatePipe implements PipeTransform {
  private readonly translation = inject(TranslationService);

  transform(
    value: Date | string | number | null | undefined,
    style: 'relative' | 'medium' = 'relative',
  ): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const locale = this.translation.currentLanguage().angularLocale;

    if (style === 'medium') {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
    }

    const diffMs = date.getTime() - Date.now();
    const absSec = Math.round(Math.abs(diffMs) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (absSec < 60) {
      return rtf.format(Math.round(diffMs / 1000), 'second');
    }
    if (absSec < 3600) {
      return rtf.format(Math.round(diffMs / 60000), 'minute');
    }
    if (absSec < 86400) {
      return rtf.format(Math.round(diffMs / 3600000), 'hour');
    }
    if (absSec < 86400 * 30) {
      return rtf.format(Math.round(diffMs / 86400000), 'day');
    }

    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  }
}
