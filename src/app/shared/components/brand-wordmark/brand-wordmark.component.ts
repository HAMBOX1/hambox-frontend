import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { BrandLogoService } from '../../../core/branding/brand-logo.service';

/**
 * The store's brand in the header. By default it is the HAMBOX name as live text in two colours (HAM in the
 * text colour, BOX in the brand green): it stays sharp at any size and can be made as large as the header
 * needs. When a logo image has been uploaded in Admin → Settings → Branding, that image is shown instead.
 */
@Component({
  selector: 'app-brand-wordmark',
  standalone: true,
  template: `@if (logo.logoUrl(); as url) {
      <img class="wordmark-image" [class.wordmark-image--large]="size() === 'large'" [src]="url" alt="HAMBOX" />
    } @else {
      <span class="wordmark" [class.wordmark--large]="size() === 'large'" aria-label="HAMBOX"
        ><span class="wordmark__ham" aria-hidden="true">HAM</span><span class="wordmark__box" aria-hidden="true">BOX</span></span
      >
    }`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
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

    .wordmark-image {
      display: block;
      height: 2rem;
      width: auto;
      max-width: 11rem;
      object-fit: contain;
    }

    .wordmark-image--large {
      height: 2.75rem;
      max-width: 14rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandWordmarkComponent {
  protected readonly logo = inject(BrandLogoService);

  readonly size = input<'normal' | 'large'>('normal');

  constructor() {
    this.logo.ensureLoaded();
  }
}
