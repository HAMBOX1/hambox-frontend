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
        @if (hasText()) {
          <div class="image-banner__frame">
            <ng-container *ngTemplateOutlet="picture" />
            <div class="image-banner__overlay">
              @if (config().title) {
                <strong class="image-banner__title">{{ config().title }}</strong>
              }
              @if (config().subtitle) {
                <span class="image-banner__subtitle">{{ config().subtitle }}</span>
              }
              @if (config().buttonText && buttonUrl(); as target) {
                @if (isInternal(target)) {
                  <a class="image-banner__button" [routerLink]="target">{{ config().buttonText }}</a>
                } @else {
                  <a class="image-banner__button" [href]="target" rel="noopener">{{ config().buttonText }}</a>
                }
              }
            </div>
          </div>
        } @else if (linkUrl(); as url) {
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

    .image-banner__frame {
      position: relative;
    }

    .image-banner__overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      gap: 8px;
      padding: clamp(14px, 4vw, 48px);
      border-radius: var(--sf-radius-lg, 16px);
      background: linear-gradient(90deg, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0) 70%);
      color: #fff;
    }

    :host-context([dir='rtl']) .image-banner__overlay {
      background: linear-gradient(270deg, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0) 70%);
    }

    .image-banner__title {
      max-width: 22ch;
      font-size: clamp(1.1rem, 3.2vw, 2.2rem);
      line-height: 1.15;
    }

    .image-banner__subtitle {
      max-width: 34ch;
      font-size: clamp(0.8rem, 1.8vw, 1.05rem);
      opacity: 0.92;
    }

    .image-banner__button {
      margin-top: 4px;
      padding: 9px 20px;
      border-radius: 999px;
      background: var(--color-primary, #3cdc96);
      color: var(--color-on-primary, #07130d);
      font-weight: 700;
      font-size: clamp(0.8rem, 1.6vw, 0.95rem);
      text-decoration: none;
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
  protected readonly buttonUrl = computed(() => this.config().buttonUrl?.trim() || this.config().linkUrl?.trim() || null);
  /** Text laid over the picture; when present the button (not the whole picture) is what customers tap. */
  protected readonly hasText = computed(() => !!(this.config().title || this.config().subtitle || this.config().buttonText));

  protected isInternal(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
  }
}
