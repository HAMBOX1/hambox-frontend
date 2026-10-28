import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The HAMBOX name as live text in two colours (HAM in the text colour, BOX in the brand green) instead of the
 * small logo image: it stays sharp at any size and can be made as large as the header needs.
 */
@Component({
  selector: 'app-brand-wordmark',
  standalone: true,
  template: `<span class="wordmark" [class.wordmark--large]="size() === 'large'" aria-label="HAMBOX"
    ><span class="wordmark__ham" aria-hidden="true">HAM</span><span class="wordmark__box" aria-hidden="true">BOX</span></span
  >`,
  styles: `
    :host {
      display: inline-flex;
      line-height: 1;
    }

    .wordmark {
      font-family: var(--sf-font-heading, inherit);
      font-size: 1.75rem;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .wordmark--large {
      font-size: 2.5rem;
    }

    .wordmark__ham {
      color: var(--color-text-primary, #fff);
    }

    .wordmark__box {
      color: var(--color-primary, #34d399);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandWordmarkComponent {
  readonly size = input<'normal' | 'large'>('normal');
}
