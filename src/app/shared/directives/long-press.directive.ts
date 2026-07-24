import { Directive, ElementRef, inject, OnDestroy, output } from '@angular/core';

const LONG_PRESS_MS = 500;

/** Touch-and-hold gesture; mirrors the existing dblclick-to-edit affordance for touch devices. */
@Directive({
  selector: '[hamboxLongPress]',
  standalone: true,
})
export class LongPressDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly hamboxLongPress = output<void>();

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const target = this.el.nativeElement;
    target.addEventListener('touchstart', this.start, { passive: true });
    target.addEventListener('touchend', this.clear);
    target.addEventListener('touchmove', this.clear);
    target.addEventListener('touchcancel', this.clear);
  }

  private readonly start = (): void => {
    this.clear();
    this.timer = setTimeout(() => this.hamboxLongPress.emit(), LONG_PRESS_MS);
  };

  private readonly clear = (): void => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  };

  ngOnDestroy(): void {
    this.clear();
    const target = this.el.nativeElement;
    target.removeEventListener('touchstart', this.start);
    target.removeEventListener('touchend', this.clear);
    target.removeEventListener('touchmove', this.clear);
    target.removeEventListener('touchcancel', this.clear);
  }
}
