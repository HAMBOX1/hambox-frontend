import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { HamboxScrollLockService } from '../../services/hambox-scroll-lock.service';

const DISMISS_DRAG_THRESHOLD_PX = 72;

@Component({
  selector: 'app-hambox-bottom-sheet',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './hambox-bottom-sheet.component.html',
  styleUrl: './hambox-bottom-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HamboxBottomSheetComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly scrollLock = inject(HamboxScrollLockService);

  readonly open = input(false);
  readonly title = input('');
  readonly showHeader = input(true);
  readonly heightVh = input(80);
  readonly ariaLabel = input('');
  readonly dragToDismiss = input(true);
  readonly portal = input(true);

  readonly closed = output<void>();

  protected readonly dragOffset = signal(0);
  protected readonly isDragging = signal(false);

  private portalParent: HTMLElement | null = null;
  private portalNextSibling: ChildNode | null = null;
  private touchStartY = 0;
  private activeTouchId: number | null = null;
  private scrollLocked = false;

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (isOpen) {
        queueMicrotask(() => {
          this.attachPortal();
          this.lockScroll();
        });
        this.dragOffset.set(0);
      } else {
        this.detachPortal();
        this.unlockScroll();
        this.dragOffset.set(0);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.detachPortal();
      this.unlockScroll(true);
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  protected onBackdropClick(): void {
    this.closed.emit();
  }

  protected onPanelClick(event: Event): void {
    event.stopPropagation();
  }

  protected onDragHandleTouchStart(event: TouchEvent): void {
    if (!this.dragToDismiss() || event.touches.length !== 1) {
      return;
    }

    this.touchStartY = event.touches[0].clientY;
    this.activeTouchId = event.touches[0].identifier;
    this.isDragging.set(true);
  }

  protected onDragHandleTouchMove(event: TouchEvent): void {
    if (!this.isDragging() || this.activeTouchId === null) {
      return;
    }

    const touch = Array.from(event.touches).find((t) => t.identifier === this.activeTouchId);
    if (!touch) {
      return;
    }

    const delta = Math.max(0, touch.clientY - this.touchStartY);
    this.dragOffset.set(delta);

    if (delta > 0) {
      event.preventDefault();
    }
  }

  protected onDragHandleTouchEnd(event: TouchEvent): void {
    if (!this.isDragging()) {
      return;
    }

    const touch = Array.from(event.changedTouches).find((t) => t.identifier === this.activeTouchId);
    const delta = touch ? Math.max(0, touch.clientY - this.touchStartY) : this.dragOffset();

    this.isDragging.set(false);
    this.activeTouchId = null;

    if (delta >= DISMISS_DRAG_THRESHOLD_PX) {
      this.closed.emit();
      return;
    }

    this.dragOffset.set(0);
  }

  protected panelTransform(): string {
    const offset = this.dragOffset();
    return offset > 0 ? `translateY(${offset}px)` : '';
  }

  protected panelHeightStyle(): string {
    return `${this.heightVh()}vh`;
  }

  private lockScroll(): void {
    if (this.scrollLocked) {
      return;
    }

    this.scrollLock.lock();
    this.scrollLocked = true;
  }

  private unlockScroll(force = false): void {
    if (!this.scrollLocked && !force) {
      return;
    }

    this.scrollLock.unlock();
    this.scrollLocked = false;
  }

  private attachPortal(): void {
    if (!this.portal()) {
      return;
    }

    const element = this.host.nativeElement;
    if (element.parentElement === this.document.body) {
      return;
    }

    this.portalParent = element.parentElement;
    this.portalNextSibling = element.nextSibling;
    this.document.body.appendChild(element);
  }

  private detachPortal(): void {
    if (!this.portal() || !this.portalParent) {
      return;
    }

    const element = this.host.nativeElement;
    if (element.parentElement !== this.document.body) {
      this.portalParent = null;
      this.portalNextSibling = null;
      return;
    }

    if (this.portalNextSibling) {
      this.portalParent.insertBefore(element, this.portalNextSibling);
    } else {
      this.portalParent.appendChild(element);
    }

    this.portalParent = null;
    this.portalNextSibling = null;
  }
}
