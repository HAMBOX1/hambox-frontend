import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { CurrencyService } from '../../../core/currency/currency.service';
import { SupportedCurrencyCode } from '../../../core/currency/currency.model';

@Component({
  selector: 'app-currency-switcher',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './currency-switcher.component.html',
  styleUrl: './currency-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencySwitcherComponent {
  private readonly currencyService = inject(CurrencyService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly open = signal(false);
  protected readonly currencies = this.currencyService.currencies;
  protected readonly current = this.currencyService.currentCurrency;

  protected async selectCurrency(code: SupportedCurrencyCode): Promise<void> {
    await this.currencyService.setCurrency(code);
    this.open.set(false);
  }

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
