import { Pipe, PipeTransform, inject } from '@angular/core';

import { TranslationService } from '../../core/i18n/translation.service';

/** Locale-aware date formatter. */
@Pipe({
  name: 'hamboxDate',
  standalone: true,
  pure: false,
})
export class HamboxDatePipe implements PipeTransform {
  private readonly translation = inject(TranslationService);

  transform(
    value: Date | string | number | null | undefined,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const locale = this.translation.currentLanguage().angularLocale;
    return new Intl.DateTimeFormat(locale, options ?? { dateStyle: 'medium' }).format(date);
  }
}
