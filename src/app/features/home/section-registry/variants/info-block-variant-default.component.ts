import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { InfoBlockSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

/**
 * A free content block: a title, some text and an optional picture. Because it is not tied to products or categories it
 * serves as instructions, an announcement or an ad campaign, on the homepage or on a product / category page. A button
 * under it comes from the shared "Button under this section" options every section has.
 */
@Component({
  selector: 'app-info-block-variant-default',
  standalone: true,
  template: `
    <section class="info-block" [class.info-block--with-image]="!!config().imageUrl" [style.--info-accent]="config().accentColor || null">
      @if (config().imageUrl; as image) {
        <img class="info-block__image" [src]="image" alt="" loading="lazy" />
      }
      <div class="info-block__text">
        @if (config().title) {
          <h2 class="info-block__title">{{ config().title }}</h2>
        }
        @if (paragraphs().length) {
          <div class="info-block__body">
            @for (paragraph of paragraphs(); track $index) {
              <p>{{ paragraph }}</p>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .info-block {
      display: grid;
      gap: 20px;
      align-items: center;
      margin: 0 16px 32px;
      padding: 24px;
      border: 1px solid color-mix(in srgb, var(--info-accent, var(--color-primary, #3cdc96)) 45%, transparent);
      border-radius: var(--sf-radius-xl, 24px);
      background: color-mix(in srgb, var(--info-accent, var(--color-primary, #3cdc96)) 10%, var(--color-surface, #1a1a1c));
    }

    .info-block--with-image {
      grid-template-columns: minmax(0, 1fr);
    }

    @media (min-width: 768px) {
      .info-block--with-image {
        grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
      }
    }

    .info-block__image {
      width: 100%;
      max-height: 320px;
      border-radius: var(--sf-radius-lg, 16px);
      object-fit: cover;
    }

    .info-block__title {
      margin: 0 0 12px;
      font-family: var(--sf-font-heading, inherit);
      font-size: clamp(1.25rem, 2.5vw, 1.75rem);
      color: var(--section-title-color, var(--color-text-primary, #fff));
    }

    .info-block__body p {
      margin: 0 0 10px;
      line-height: 1.6;
      color: var(--color-text-secondary, #c5c9cc);
    }

    .info-block__body p:last-child {
      margin-bottom: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoBlockVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<InfoBlockSectionConfig>();

  /** The text split into paragraphs at blank lines / line breaks, shown as plain text (never as HTML). */
  protected readonly paragraphs = computed(() =>
    (this.config().body ?? '')
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  );
}
