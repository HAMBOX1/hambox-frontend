import { DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * One-shot scroll-entrance primitive shared by every landing-page section (wired centrally in
 * SectionRendererComponent) and any leaf component that wants its own staggered children.
 * Adds `.is-visible` once the host crosses the viewport threshold, then disconnects — cheap,
 * no per-frame work, no Angular change detection involved (plain DOM class toggle).
 *
 * Motion itself lives in CSS (see styles/motion.scss `.motion-*` classes) so this directive only
 * ever toggles a class; it never touches transform/opacity directly.
 */
@Directive({
  selector: '[hamboxReveal]',
  standalone: true,
  host: {
    '[style.--reveal-delay]': 'delayStyle',
  },
})
export class ScrollRevealDirective {
  /** Extra delay in ms, e.g. for grid stagger: [style.--i]="i" hamboxRevealDelay="i * 60" */
  readonly hamboxRevealDelay = input(0, { alias: 'hamboxRevealDelay' });
  /** Fraction of the host that must be visible before it reveals. */
  readonly hamboxRevealThreshold = input(0.15, { alias: 'hamboxRevealThreshold' });

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected get delayStyle(): string {
    return `${this.hamboxRevealDelay()}ms`;
  }

  constructor() {
    const element = this.host.nativeElement;
    element.classList.add('motion-reveal-init');

    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      element.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            element.classList.add('is-visible');
            observer.disconnect();
          }
        }
      },
      { threshold: this.hamboxRevealThreshold(), rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(element);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
