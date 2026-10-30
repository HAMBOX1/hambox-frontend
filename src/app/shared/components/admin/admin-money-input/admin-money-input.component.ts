import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { CurrencyService } from '../../../../core/currency/currency.service';
import { AVAILABLE_CURRENCIES, SupportedCurrencyCode } from '../../../../core/currency/currency.model';

/**
 * Inline money field for the admin tables: a plain numeric box (no "US$" formatting inside it, so `0.3` can simply be
 * typed), the whole value selected when it opens, and a currency picker. Prices are stored in USD, so whatever is typed
 * in another currency is converted with the live exchange rate and reported to the parent in USD.
 */
@Component({
  selector: 'app-admin-money-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="money-input" (focusout)="onFocusOut($event)">
      <input
        #field
        class="money-input__field"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        [value]="text()"
        [attr.aria-label]="ariaLabel()"
        (input)="onInput($event)"
        (keydown.enter)="committed.emit()"
        (keydown.escape)="cancelled.emit()"
      />
      <select
        class="money-input__currency"
        [value]="currency()"
        aria-label="Currency"
        (change)="onCurrencyChange($event)"
        (click)="$event.stopPropagation()"
      >
        @for (item of currencies; track item.code) {
          <option [value]="item.code" [selected]="item.code === currency()">{{ item.code }}</option>
        }
      </select>
      @if (hint(); as text) {
        <span class="money-input__hint">{{ text }}</span>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-block;
    }

    .money-input {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .money-input__field,
    .money-input__currency {
      height: 2rem;
      border: 1px solid var(--color-primary, #1f9d6b);
      border-radius: var(--sf-radius-sm, 6px);
      background: var(--color-surface, #121212);
      color: var(--color-text-primary, #fff);
      font: inherit;
      font-size: 0.85rem;
    }

    .money-input__field {
      width: 5.5rem;
      padding: 0 8px;
      text-align: end;
    }

    .money-input__currency {
      padding: 0 4px;
      border-color: var(--color-border, #333);
    }

    .money-input__hint {
      flex-basis: 100%;
      font-size: 0.7rem;
      color: var(--color-text-muted, #999);
    }
  `,
})
export class AdminMoneyInputComponent {
  private readonly currencyService = inject(CurrencyService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  /** Current amount in USD (what the API stores). */
  readonly value = input<number | null>(null);
  readonly ariaLabel = input('Amount');

  /** Emits the amount converted to USD (rounded to cents) on every keystroke / currency change. */
  readonly valueChange = output<number | null>();
  /** Enter pressed, or focus left the field and the currency picker. */
  readonly committed = output<void>();
  readonly cancelled = output<void>();

  protected readonly currencies = AVAILABLE_CURRENCIES;
  protected readonly currency = signal<SupportedCurrencyCode>('USD');
  protected readonly text = signal('');

  private readonly typedAmount = computed(() => this.parse(this.text()));

  protected readonly hint = computed(() => {
    const amount = this.typedAmount();
    if (this.currency() === 'USD' || amount === null) {
      return '';
    }

    const usd = this.toUsd(amount);
    return `≈ $${usd.toFixed(2)}`;
  });

  constructor() {
    afterNextRender(() => {
      const initial = this.value();
      this.text.set(initial === null ? '' : this.format(initial));
      const input = this.field().nativeElement;
      input.value = this.text();
      input.focus();
      input.select();
    });
  }

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    // Only digits and one decimal separator; a comma counts as the separator.
    const cleaned = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    const text = firstDot === -1 ? cleaned : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
    this.text.set(text);
    (event.target as HTMLInputElement).value = text;
    this.emitUsd();
  }

  protected onCurrencyChange(event: Event): void {
    this.currency.set((event.target as HTMLSelectElement).value as SupportedCurrencyCode);
    this.emitUsd();
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.host.nativeElement.contains(next)) {
      return;
    }

    this.committed.emit();
  }

  private emitUsd(): void {
    const amount = this.typedAmount();
    this.valueChange.emit(amount === null ? null : this.toUsd(amount));
  }

  private toUsd(amount: number): number {
    const rate = this.currency() === 'USD' ? 1 : (this.currencyService.rates()[this.currency()] ?? 1);
    return Math.round((amount / (rate || 1)) * 100) / 100;
  }

  private parse(text: string): number | null {
    if (text === '' || text === '.') {
      return null;
    }

    const value = Number(text);
    return Number.isFinite(value) ? value : null;
  }

  private format(value: number): string {
    return String(Math.round(value * 100) / 100);
  }
}
