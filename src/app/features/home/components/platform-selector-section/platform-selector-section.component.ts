import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import { PlatformSelectorSectionConfig } from '../../section-registry/models/section-config.model';

@Component({
  selector: 'app-platform-selector-section',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './platform-selector-section.component.html',
  styleUrl: './platform-selector-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformSelectorSectionComponent implements AfterViewInit, OnDestroy {
  readonly config = input.required<PlatformSelectorSectionConfig>();

  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private resizeObserver?: ResizeObserver;

  /** Arrows only show when the strip is wider than the screen (a mouse has no swipe), and only toward more content. */
  protected readonly canScrollBack = signal(false);
  protected readonly canScrollForward = signal(false);

  /** Splits a chosen link into what the router needs: an in-app path with its query, or a full external address. */
  protected linkTarget(url: string): { external: boolean; path: string; query: Record<string, string> } {
    if (/^https?:\/\//i.test(url)) {
      return { external: true, path: url, query: {} };
    }
    const [path, search = ''] = url.split('?');
    return { external: false, path: path || '/', query: Object.fromEntries(new URLSearchParams(search)) };
  }

  ngAfterViewInit(): void {
    const element = this.list()?.nativeElement;
    if (!element) {
      return;
    }
    this.updateArrows();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateArrows());
      this.resizeObserver.observe(element);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  protected updateArrows(): void {
    const element = this.list()?.nativeElement;
    if (!element) {
      return;
    }
    // `scrollLeft` is negative in right-to-left pages, so work with its absolute distance from the start edge.
    const fromStart = Math.abs(element.scrollLeft);
    const maxScroll = element.scrollWidth - element.clientWidth;
    // A few pixels of slack: scroll-snap rests the strip a hair away from its very start/end.
    this.canScrollBack.set(fromStart > 8);
    this.canScrollForward.set(fromStart < maxScroll - 8);
  }

  protected scrollStrip(direction: -1 | 1): void {
    const element = this.list()?.nativeElement;
    if (!element) {
      return;
    }
    // Forward = toward the end of the strip, which is to the left in right-to-left pages.
    const rtl = getComputedStyle(element).direction === 'rtl';
    element.scrollBy({ left: direction * (rtl ? -1 : 1) * element.clientWidth * 0.8, behavior: 'smooth' });
  }
}
