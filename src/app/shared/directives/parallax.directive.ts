import { DestroyRef, Directive, ElementRef, NgZone, inject, input } from '@angular/core';

import { prefersReducedMotion } from './scroll-reveal.directive';

/**
 * Cheap scroll-parallax primitive: writes a `--parallax-y` custom property (px) that the host's
 * own CSS reads via `transform: translate3d(0, var(--parallax-y), 0)`. Only listens while the
 * host is intersecting the viewport (IntersectionObserver-gated) and runs entirely outside
 * Angular's zone so scrolling never triggers change detection. Intended for a small number of
 * hero-scale elements, not a generic "add to everything" primitive — heavy use would defeat the
 * point of keeping this cheap.
 */
@Directive({
  selector: '[hamboxParallax]',
  standalone: true,
})
export class ParallaxDirective {
  /** Strength in px of translation across the element's own scroll range; smaller = subtler. */
  readonly hamboxParallax = input(24, { alias: 'hamboxParallax' });

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    if (typeof window === 'undefined' || prefersReducedMotion()) {
      return;
    }

    const element = this.host.nativeElement;
    let ticking = false;
    let active = false;

    const update = (): void => {
      ticking = false;
      const rect = element.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const progress = (rect.top + rect.height / 2 - viewportH / 2) / viewportH;
      const offset = progress * this.hamboxParallax();
      element.style.setProperty('--parallax-y', `${offset.toFixed(2)}px`);
    };

    const onScroll = (): void => {
      if (!active || ticking) {
        return;
      }
      ticking = true;
      requestAnimationFrame(update);
    };

    this.zone.runOutsideAngular(() => {
      const observer = new IntersectionObserver((entries) => {
        active = entries.some((entry) => entry.isIntersecting);
        if (active) {
          update();
        }
      });
      observer.observe(element);

      window.addEventListener('scroll', onScroll, { passive: true });

      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        window.removeEventListener('scroll', onScroll);
      });
    });
  }
}
