import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class HamboxScrollLockService {
  private readonly document = inject(DOCUMENT);
  private lockCount = 0;
  private previousOverflow = '';
  private previousPaddingRight = '';

  lock(): void {
    const body = this.document.body;
    if (!body) {
      return;
    }

    if (this.lockCount === 0) {
      const scrollbarWidth = window.innerWidth - this.document.documentElement.clientWidth;
      this.previousOverflow = body.style.overflow;
      this.previousPaddingRight = body.style.paddingRight;
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    this.lockCount += 1;
  }

  unlock(): void {
    const body = this.document.body;
    if (!body || this.lockCount === 0) {
      return;
    }

    this.lockCount -= 1;
    if (this.lockCount === 0) {
      body.style.overflow = this.previousOverflow;
      body.style.paddingRight = this.previousPaddingRight;
    }
  }
}
