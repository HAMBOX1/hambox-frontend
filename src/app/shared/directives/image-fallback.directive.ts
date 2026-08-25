import { Directive, ElementRef, HostListener, Renderer2, inject } from '@angular/core';

const FALLBACK_SRC = 'assets/images/placeholders/product.svg';

/**
 * Swaps a broken/failed <img> to the neutral product placeholder illustration
 * instead of the browser's default broken-image glyph. Resets sizing so the
 * illustration centers cleanly even inside boxes that crop real photos via
 * object-fit: cover (or an oversized/negative-margin zoom-crop trick).
 */
@Directive({
  selector: 'img[hamboxImgFallback]',
  standalone: true,
})
export class ImageFallbackDirective {
  private readonly el = inject(ElementRef<HTMLImageElement>).nativeElement;
  private readonly renderer = inject(Renderer2);

  @HostListener('error')
  protected onError(): void {
    if (this.el.src.endsWith(FALLBACK_SRC)) {
      return;
    }

    this.el.src = FALLBACK_SRC;
    this.renderer.setStyle(this.el, 'object-fit', 'contain');
    this.renderer.setStyle(this.el, 'width', '100%');
    this.renderer.setStyle(this.el, 'height', '100%');
    this.renderer.setStyle(this.el, 'margin', '0');
    this.renderer.setStyle(this.el, 'padding', '18%');
    this.renderer.setStyle(this.el, 'box-sizing', 'border-box');
    this.renderer.setStyle(this.el, 'background', 'var(--color-surface-muted)');
  }
}
