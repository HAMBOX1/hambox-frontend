import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AdminPageTitleService {
  private readonly titleState = signal('');

  readonly title = this.titleState.asReadonly();

  setTitle(title: string): void {
    this.titleState.set(title);
  }
}
