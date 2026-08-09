import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CartNavWidgetComponent } from '../../../cart/components/cart-nav-widget/cart-nav-widget.component';
import { LanguageSwitcherComponent } from '../../../../shared/components/language-switcher/language-switcher.component';
import { CurrencySwitcherComponent } from '../../../../shared/components/currency-switcher/currency-switcher.component';
import { ThemeToggleComponent } from '../../../../shared/components/theme-toggle/theme-toggle.component';
import { StorefrontSearchComponent } from '../../../../shared/components/storefront-search/storefront-search.component';
import { StorefrontNavMode } from '../../../../shared/components/storefront-nav/storefront-nav.model';
import { NavLink } from '../../models/storefront-home';
import { isStorefrontNavLinkActive, navLinkQueryParams } from '../../../../shared/utils/storefront-nav.utils';

@Component({
  selector: 'app-top-nav-guest',
  standalone: true,
  imports: [
    RouterLink,
    CartNavWidgetComponent,
    ThemeToggleComponent,
    LanguageSwitcherComponent,
    CurrencySwitcherComponent,
    StorefrontSearchComponent,
    TranslatePipe,
  ],
  templateUrl: './top-nav-guest.component.html',
  styleUrl: './top-nav-guest.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopNavGuestComponent {
  private readonly router = inject(Router);

  links = input.required<readonly NavLink[]>();
  mode = input<StorefrontNavMode>('storefront');
  compact = input(false);
  elevated = input(false);

  protected readonly logoSrc = 'assets/images/top-nav/hambox-title.png';

  protected isLinkActive(link: NavLink): boolean {
    const tree = this.router.parseUrl(this.router.url);
    const segments = tree.root.children['primary']?.segments ?? [];
    const path = segments.length ? `/${segments.map((segment) => segment.path).join('/')}` : '/';
    return isStorefrontNavLinkActive(link, path, tree.queryParamMap);
  }

  protected linkQueryParams(link: NavLink): Record<string, string> | null {
    return navLinkQueryParams(link) ?? null;
  }
}
