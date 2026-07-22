import { inject, Injectable, signal } from '@angular/core';

import { MobileViewportService } from '../../../shared/services/mobile-viewport.service';

export type AdminProductsViewMode = 'table' | 'cards';

const STORAGE_KEY = 'hambox.admin.products.viewMode';

@Injectable({ providedIn: 'root' })
export class AdminProductsViewModeService {
  private readonly mobileViewport = inject(MobileViewportService);

  private readonly modeState = signal<AdminProductsViewMode>(this.readInitialMode());

  readonly mode = this.modeState.asReadonly();

  setMode(mode: AdminProductsViewMode): void {
    this.modeState.set(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }

  private readInitialMode(): AdminProductsViewMode {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'table' || stored === 'cards') {
        return stored;
      }
    }

    return this.mobileViewport.isMobile() ? 'cards' : 'table';
  }
}
