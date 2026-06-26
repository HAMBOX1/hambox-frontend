import { Pipe, PipeTransform, inject } from '@angular/core';

import { CurrencyService } from '../../core/currency/currency.service';

/**
 * Formats stored USD base amounts in the user's active currency and locale.
 * Impure so all prices update instantly when currency or language changes.
 */
@Pipe({
  name: 'hamboxCurrency',
  standalone: true,
  pure: false,
})
export class HamboxCurrencyPipe implements PipeTransform {
  private readonly currency = inject(CurrencyService);

  transform(value: number | string | null | undefined, digitsInfo = '1.2-2'): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const numeric = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(numeric)) {
      return '';
    }

    return this.currency.format(numeric, digitsInfo);
  }
}
