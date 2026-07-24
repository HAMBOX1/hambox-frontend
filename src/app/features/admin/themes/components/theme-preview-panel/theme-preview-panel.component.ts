import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

import { AdminSectionCardComponent } from '../../../../../shared/components/admin';

type PreviewPage = 'home' | 'products' | 'product-details' | 'cart' | 'login';
type ViewportSize = 'desktop' | 'tablet' | 'mobile';

interface PreviewPageOption {
  readonly id: PreviewPage;
  readonly labelKey: string;
}

const PREVIEW_PAGES: readonly PreviewPageOption[] = [
  { id: 'home', labelKey: 'ADMIN.THEMES.PREVIEW.PAGES.HOME' },
  { id: 'products', labelKey: 'ADMIN.THEMES.PREVIEW.PAGES.PRODUCTS' },
  { id: 'product-details', labelKey: 'ADMIN.THEMES.PREVIEW.PAGES.PRODUCT_DETAILS' },
  { id: 'cart', labelKey: 'ADMIN.THEMES.PREVIEW.PAGES.CART' },
  { id: 'login', labelKey: 'ADMIN.THEMES.PREVIEW.PAGES.LOGIN' },
];

const VIEWPORTS: readonly { id: ViewportSize; icon: string }[] = [
  { id: 'desktop', icon: 'pi pi-desktop' },
  { id: 'tablet', icon: 'pi pi-tablet' },
  { id: 'mobile', icon: 'pi pi-mobile' },
];

@Component({
  selector: 'app-theme-preview-panel',
  standalone: true,
  imports: [TranslatePipe, ButtonModule, AdminSectionCardComponent, DecimalPipe],
  templateUrl: './theme-preview-panel.component.html',
  styleUrl: './theme-preview-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemePreviewPanelComponent {
  readonly themeName = input('');
  readonly baseMode = input('Dark');

  protected readonly pages = PREVIEW_PAGES;
  protected readonly viewports = VIEWPORTS;
  protected readonly activePage = signal<PreviewPage>('home');
  protected readonly viewportSize = signal<ViewportSize>('desktop');

  protected selectPage(page: PreviewPage): void {
    this.activePage.set(page);
  }

  protected selectViewport(size: ViewportSize): void {
    this.viewportSize.set(size);
  }
}
