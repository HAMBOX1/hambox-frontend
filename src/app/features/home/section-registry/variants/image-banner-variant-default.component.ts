import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ImageBannerSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-image-banner-variant-default',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  template: `
    @if (config().imageUrl) {
      <section class="image-banner" [attr.aria-label]="config().altText || 'Banner'">
        @if (linkUrl(); as url) {
          @if (isInternal(url)) {
            <a class="image-banner__link" [routerLink]="url">
              <ng-container *ngTemplateOutlet="picture" />
            </a>
          } @else {
            <a class="image-banner__link" [href]="url" rel="noopener">
              <ng-container *ngTemplateOutlet="picture" />
            </a>
          }
        } @else {
          <ng-container *ngTemplateOutlet="picture" />
        }
      </section>
    }

    <ng-template #picture>
      <picture>
        @if (config().mobileImageUrl) {
          <source media="(max-width: 640px)" [srcset]="config().mobileImageUrl" />
        }
        <img class="image-banner__image" [src]="config().imageUrl" [alt]="config().altText" loading="lazy" />
      </picture>
    </ng-template>
  `,
  styles: `
    .image-banner {
      width: 100%;
      padding: 0 16px 32px;
    }

    .image-banner__link {
      display: block;
    }

    .image-banner__image {
      display: block;
      width: 100%;
      height: auto;
      border-radius: var(--sf-radius-lg, 16px);
      object-fit: cover;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageBannerVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<ImageBannerSectionConfig>();

  protected readonly linkUrl = computed(() => this.config().linkUrl?.trim() || null);

  protected isInternal(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
  }
}
