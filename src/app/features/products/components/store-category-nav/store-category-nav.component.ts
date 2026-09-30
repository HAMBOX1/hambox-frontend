import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { StoreCategoryPill } from '../../models/product';

@Component({
  selector: 'app-store-category-nav',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './store-category-nav.component.html',
  styleUrl: './store-category-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreCategoryNavComponent implements AfterViewInit, OnDestroy {
  categories = input.required<readonly StoreCategoryPill[]>();
  activeCategoryId = input('all');

  categoryChange = output<string>();

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private resizeObserver?: ResizeObserver;

  protected readonly canScrollStart = signal(false);
  protected readonly canScrollEnd = signal(false);

  constructor() {
    // The pill list arrives asynchronously (after the categories API call resolves), so the
    // overflow check has to re-run once it does — a static ngAfterViewInit check alone would
    // run against an empty/short list.
    effect(() => {
      this.categories();
      queueMicrotask(() => this.updateScrollState());
    });
  }

  ngAfterViewInit(): void {
    const element = this.scroller()?.nativeElement;
    if (!element) {
      return;
    }

    this.updateScrollState();
    this.resizeObserver = new ResizeObserver(() => this.updateScrollState());
    this.resizeObserver.observe(element);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.updateScrollState();
  }

  protected select(categoryId: string): void {
    if (categoryId === this.activeCategoryId()) {
      return;
    }

    this.categoryChange.emit(categoryId);
  }

  protected onScroll(): void {
    this.updateScrollState();
  }

  protected scrollByDirection(direction: 1 | -1): void {
    const element = this.scroller()?.nativeElement;
    if (!element) {
      return;
    }

    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: 'smooth' });
  }

  private updateScrollState(): void {
    const element = this.scroller()?.nativeElement;
    if (!element) {
      this.canScrollStart.set(false);
      this.canScrollEnd.set(false);
      return;
    }

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    // scrollLeft can land 1-2px shy of the true edge due to subpixel rounding, so a bare
    // `> 0` / `< max` check flickers the arrows/fade on and off near the ends — 1px of
    // slack absorbs that without meaningfully delaying when they actually disappear.
    this.canScrollStart.set(element.scrollLeft > 1);
    this.canScrollEnd.set(element.scrollLeft < maxScrollLeft - 1);
  }
}
