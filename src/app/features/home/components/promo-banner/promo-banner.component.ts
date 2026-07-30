import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { StorefrontPromoBannerContent } from '../../models/storefront-content.model';

@Component({
  selector: 'app-promo-banner',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  template: `
    @if (banner().visible) {
      <section
        class="promo-banner"
        [style.background]="banner().backgroundColor"
        aria-labelledby="promo-banner-title"
      >
        <div class="promo-banner__media" aria-hidden="true">
          <img [src]="banner().imageUrl" alt="" />
        </div>
        <div class="promo-banner__copy">
          <h2 id="promo-banner-title">{{ banner().title }}</h2>
          <p>{{ banner().subtitle }}</p>
          <a pButton [routerLink]="banner().buttonUrl" class="promo-banner__cta">
            {{ banner().buttonText }}
          </a>
        </div>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: var(--sf-section-gap) var(--sf-container-px);
    }

    .promo-banner {
      position: relative;
      overflow: hidden;
      border-radius: var(--sf-radius-xl);
      margin: 0 auto;
      max-width: var(--sf-container-max);
      min-height: 220px;
      display: grid;
      align-items: center;
      box-shadow: var(--color-shadow-md);
    }

    .promo-banner__media {
      position: absolute;
      inset: 0;
      opacity: 0.35;
    }

    .promo-banner__media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }

    .promo-banner__copy {
      position: relative;
      z-index: 1;
      padding: 2.5rem;
      color: #fff;
      display: grid;
      gap: 0.75rem;
      max-width: 560px;
    }

    .promo-banner__copy h2 {
      margin: 0;
      font-family: var(--sf-font-heading);
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .promo-banner__copy p {
      margin: 0;
      opacity: 0.9;
    }

    .promo-banner__cta {
      margin-top: 0.5rem;
      width: fit-content;
      font-weight: 700;
      transition: transform var(--hambox-transition-default), box-shadow var(--hambox-transition-default);
    }

    .promo-banner__cta:hover {
      transform: translateY(-2px);
      box-shadow: var(--hambox-shadow-lg);
    }

    @media (max-width: 991px) {
      :host {
        padding: var(--sf-section-gap) var(--sf-container-px-tablet);
      }
    }

    @media (max-width: 767px) {
      :host {
        padding: var(--sf-section-gap) var(--sf-container-px-mobile);
      }

      .promo-banner__copy {
        padding: 1.75rem;
        max-width: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoBannerComponent {
  readonly banner = input.required<StorefrontPromoBannerContent>();
}
