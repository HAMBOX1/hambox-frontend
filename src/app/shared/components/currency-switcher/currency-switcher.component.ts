import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Popover, PopoverModule } from 'primeng/popover';

import { CurrencyService } from '../../../core/currency/currency.service';
import { SupportedCurrencyCode } from '../../../core/currency/currency.model';

@Component({
  selector: 'app-currency-switcher',
  standalone: true,
  imports: [TranslatePipe, PopoverModule],
  templateUrl: './currency-switcher.component.html',
  styleUrl: './currency-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencySwitcherComponent {
  private readonly currencyService = inject(CurrencyService);
  private readonly panel = viewChild.required<Popover>('panel');

  protected readonly open = signal(false);
  protected readonly currencies = this.currencyService.currencies;
  protected readonly current = this.currencyService.currentCurrency;

  protected async selectCurrency(code: SupportedCurrencyCode): Promise<void> {
    await this.currencyService.setCurrency(code);
    this.panel().hide();
  }

  protected toggle(event: Event): void {
    this.panel().toggle(event);
  }
}
