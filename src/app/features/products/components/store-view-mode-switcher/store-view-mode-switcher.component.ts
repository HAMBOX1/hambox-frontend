import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import {
  StorefrontViewMode,
  StorefrontViewModeService,
} from '../../services/storefront-view-mode.service';

@Component({
  selector: 'app-store-view-mode-switcher',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './store-view-mode-switcher.component.html',
  styleUrl: './store-view-mode-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreViewModeSwitcherComponent {
  private readonly viewModeService = inject(StorefrontViewModeService);

  readonly openFilters = output<void>();
  readonly filterCount = input(0);

  protected readonly mode = this.viewModeService.mode;

  protected setMode(mode: StorefrontViewMode): void {
    this.viewModeService.setMode(mode);
  }

  protected onOpenFilters(): void {
    this.openFilters.emit();
  }
}
