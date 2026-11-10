import { Injectable, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class AdminPageTitleService {
  private readonly browserTitle = inject(Title);
  private readonly titleState = signal('');

  readonly title = this.titleState.asReadonly();

  setTitle(title: string): void {
    this.titleState.set(title);
    if (title) {
      this.browserTitle.setTitle(`${title} · HAMBOX Admin`);
    }
  }
}
