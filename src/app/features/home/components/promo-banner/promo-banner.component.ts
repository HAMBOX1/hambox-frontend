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
    .promo-banner {
      position: relative;
      overflow: hidden;
      border-radius: 1rem;
      margin: 1.5rem auto;
      max-width: 1200px;
      min-height: 180px;
      display: grid;
      align-items: center;
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
    }

    .promo-banner__copy {
      position: relative;
      z-index: 1;
      padding: 1.5rem;
      color: #fff;
      display: grid;
      gap: 0.5rem;
    }

    .promo-banner__copy h2 {
      margin: 0;
      font-size: 1.5rem;
    }

    .promo-banner__copy p {
      margin: 0;
      opacity: 0.9;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoBannerComponent {
  readonly banner = input.required<StorefrontPromoBannerContent>();
}
