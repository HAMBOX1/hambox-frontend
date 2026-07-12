import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'hambox.account-sidebar-collapsed';

@Injectable({
  providedIn: 'root',
})
export class AccountSidebarStateService {
  private readonly collapsedState = signal(this.readCollapsed());
  private readonly mobileOpenState = signal(false);

  readonly collapsed = this.collapsedState.asReadonly();
  readonly mobileOpen = this.mobileOpenState.asReadonly();

  toggle(): void {
    this.setCollapsed(!this.collapsedState());
  }

  setCollapsed(collapsed: boolean): void {
    this.collapsedState.set(collapsed);
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }

  openMobile(): void {
    this.mobileOpenState.set(true);
  }

  closeMobile(): void {
    this.mobileOpenState.set(false);
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
