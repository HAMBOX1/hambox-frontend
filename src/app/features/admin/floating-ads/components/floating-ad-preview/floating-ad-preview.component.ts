import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, signal, viewChild } from '@angular/core';

import { FloatingAdPublic } from '../../../../../core/models/floating-ad.model';
import { FloatingAdCardComponent } from '../../../../../shared/components/floating-ad/floating-ad-card.component';
import { attachSmoothFollow } from '../../../../../shared/components/floating-ad/floating-ad-follow';

type Device = 'desktop' | 'mobile';

/**
 * Shows the floating ad the way a visitor will see it — in a mock desktop or phone screen, in the chosen corner, drawn by the
 * very same card component, and following the scroll with the same smooth motion — so the placement and the movement can be
 * judged before the ad is published. Scroll the mock page (or press "Scroll the page") to watch the motion.
 */
@Component({
  selector: 'app-floating-ad-preview',
  standalone: true,
  imports: [FloatingAdCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview">
      <div class="preview__bar">
        <div class="preview__tabs" role="tablist" aria-label="Preview device">
          <button type="button" role="tab" [attr.aria-selected]="device() === 'desktop'" [class.is-on]="device() === 'desktop'" (click)="device.set('desktop')">
            <i class="pi pi-desktop" aria-hidden="true"></i> Desktop
          </button>
          <button type="button" role="tab" [attr.aria-selected]="device() === 'mobile'" [class.is-on]="device() === 'mobile'" (click)="device.set('mobile')">
            <i class="pi pi-mobile" aria-hidden="true"></i> Mobile
          </button>
        </div>
        <button type="button" class="preview__scroll" (click)="scrollDemo()">
          <i class="pi pi-arrows-v" aria-hidden="true"></i> Scroll the page
        </button>
      </div>

      <div class="preview__frame" [class.is-mobile]="device() === 'mobile'" [attr.data-device]="device()">
        <div #screen class="preview__screen">
          <div class="preview__page" aria-hidden="true">
            <div class="mock mock--header"></div>
            @for (row of rows; track row) {
              <div class="mock mock--row">
                <span class="mock__thumb"></span>
                <span class="mock__lines"><i></i><i></i></span>
                <span class="mock__price"></span>
              </div>
            }
          </div>
        </div>

        <div #floating class="preview__ad" [attr.data-desktop]="ad().positionDesktop ?? 'BottomLeft'" [attr.data-mobile]="ad().positionMobile ?? 'Bottom'">
          <app-floating-ad-card [ad]="ad()" />
        </div>

        <span class="preview__nav" aria-hidden="true"></span>
      </div>
      <p class="preview__note">{{ note() }}</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .preview {
      display: grid;
      gap: 8px;
      padding: 12px;
      border: 1px solid var(--p-content-border-color, rgba(128, 128, 128, 0.3));
      border-radius: 12px;
      background: var(--p-content-hover-background, rgba(128, 128, 128, 0.08));
    }

    .preview__bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .preview__tabs {
      display: inline-flex;
      overflow: hidden;
      border: 1px solid var(--p-content-border-color, rgba(128, 128, 128, 0.4));
      border-radius: 8px;
    }

    .preview__tabs button,
    .preview__scroll {
      padding: 6px 12px;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
    }

    .preview__tabs button.is-on {
      background: var(--p-primary-color, #1f9d6b);
      color: var(--p-primary-contrast-color, #fff);
    }

    .preview__scroll {
      border: 1px solid var(--p-content-border-color, rgba(128, 128, 128, 0.4));
      border-radius: 8px;
    }

    .preview__frame {
      position: relative;
      overflow: hidden;
      width: 100%;
      height: 300px;
      margin: 0 auto;
      border: 4px solid #2a2f33;
      border-radius: 12px;
      background: #0d1012;
    }

    .preview__frame.is-mobile {
      width: 190px;
      height: 360px;
      border-radius: 22px;
    }

    .preview__screen {
      height: 100%;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .preview__page {
      display: grid;
      gap: 8px;
      padding: 8px;
    }

    .mock {
      border-radius: 8px;
      background: #1a1f23;
    }

    .mock--header {
      height: 26px;
      background: #20272b;
    }

    .mock--row {
      display: grid;
      grid-template-columns: 36px 1fr 34px;
      align-items: center;
      gap: 8px;
      padding: 8px;
    }

    .mock__thumb {
      height: 36px;
      border-radius: 6px;
      background: #2c3438;
    }

    .mock__lines {
      display: grid;
      gap: 6px;
    }

    .mock__lines i {
      display: block;
      height: 6px;
      border-radius: 3px;
      background: #2c3438;
    }

    .mock__lines i:last-child {
      width: 60%;
    }

    .mock__price {
      height: 14px;
      border-radius: 4px;
      background: #1f6f50;
    }

    /* The card is scaled down so a whole card fits the small mock screen. */
    .preview__ad {
      position: absolute;
      transform-origin: bottom left;
      pointer-events: none;
      will-change: transform;
      scale: 0.62;
    }

    [data-device='desktop'] .preview__ad {
      bottom: 10px;
      inset-inline-start: 10px;
    }

    [data-device='desktop'] .preview__ad[data-desktop='BottomRight'] {
      inset-inline-start: auto;
      inset-inline-end: 10px;
      transform-origin: bottom right;
      bottom: 38px;
    }

    [data-device='mobile'] .preview__ad {
      --floating-ad-max: 250px;
      scale: 0.5;
      inset-inline-start: 6px;
    }

    [data-device='mobile'] .preview__ad[data-mobile='Bottom'] {
      bottom: 46px;
    }

    [data-device='mobile'] .preview__ad[data-mobile='Top'] {
      top: 38px;
      transform-origin: top left;
    }

    .preview__nav {
      display: none;
      position: absolute;
      inset-inline: 0;
      bottom: 0;
      height: 32px;
      background: #20272b;
    }

    .is-mobile .preview__nav {
      display: block;
    }

    .preview__note {
      margin: 0;
      font-size: 0.78rem;
      opacity: 0.75;
    }
  `,
})
export class FloatingAdPreviewComponent {
  readonly ad = input.required<FloatingAdPublic>();

  private readonly screen = viewChild.required<ElementRef<HTMLElement>>('screen');
  private readonly floating = viewChild.required<ElementRef<HTMLElement>>('floating');

  protected readonly device = signal<Device>('desktop');
  protected readonly rows = Array.from({ length: 14 }, (_, i) => i);

  protected readonly note = computed(() => {
    const ad = this.ad();
    const where =
      this.device() === 'desktop'
        ? ad.positionDesktop === 'BottomRight' ? 'bottom-right (above the assistant button)' : 'bottom-left'
        : ad.positionMobile === 'Top' ? 'top (under the header)' : 'bottom (above the bottom bar)';
    return `On ${this.device() === 'desktop' ? 'a computer' : 'a phone'} the card sits ${where}, trails slightly behind the scrolling page, and stays until the visitor closes it.`;
  });

  constructor() {
    effect((onCleanup) => {
      const screen = this.screen().nativeElement;
      // The transform goes on the wrapper so the card's own corner offsets are untouched.
      onCleanup(attachSmoothFollow(screen, () => screen.scrollTop, this.floating().nativeElement));
    });
  }

  /** Scrolls the mock page down and back so the follow motion can be seen without a mouse wheel. */
  protected scrollDemo(): void {
    const screen = this.screen().nativeElement;
    const max = screen.scrollHeight - screen.clientHeight;
    const from = screen.scrollTop;
    const to = from > max / 2 ? 0 : max;
    const start = performance.now();
    const duration = 1600;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      screen.scrollTop = from + (to - from) * eased;
      if (t < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }
}
