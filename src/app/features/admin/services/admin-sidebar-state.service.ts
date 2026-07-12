import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'hambox.admin.sidebar.collapsed';

@Injectable({ providedIn: 'root' })
export class AdminSidebarStateService {
  private readonly collapsedState = signal(this.readInitialCollapsed());

  readonly collapsed = this.collapsedState.asReadonly();

  toggle(): void {
    this.setCollapsed(!this.collapsedState());
  }

  setCollapsed(collapsed: boolean): void {
    this.collapsedState.set(collapsed);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    }
  }

  private readInitialCollapsed(): boolean {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === '1') {
        return true;
      }
      if (stored === '0') {
        return false;
      }
    }

    if (typeof window === 'undefined') {
      return false;
    }

    // Tablet: collapsed by default. Desktop (≥992px): expanded.
    return window.matchMedia('(min-width: 768px) and (max-width: 991px)').matches;
  }
}
