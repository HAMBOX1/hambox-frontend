import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { CartNavWidgetComponent } from '../../../cart/components/cart-nav-widget/cart-nav-widget.component';
import { LanguageSwitcherComponent } from '../../../../shared/components/language-switcher/language-switcher.component';
import { CurrencySwitcherComponent } from '../../../../shared/components/currency-switcher/currency-switcher.component';
import { ThemeToggleComponent } from '../../../../shared/components/theme-toggle/theme-toggle.component';
import { StorefrontNavMode } from '../../../../shared/components/storefront-nav/storefront-nav.model';
import { NavLink } from '../../models/storefront-home';

@Component({
  selector: 'app-top-nav-guest',
  standalone: true,
  imports: [
    InputTextModule,
    RouterLink,
    RouterLinkActive,
    CartNavWidgetComponent,
    ThemeToggleComponent,
    LanguageSwitcherComponent,
    CurrencySwitcherComponent,
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
  protected readonly searchIconSrc = 'assets/images/top-nav/search-icon.svg';

  protected readonly searchValue = signal('');
  protected readonly menuOpen = signal(false);

  protected onSearchInput(event: Event): void {
    this.searchValue.set((event.target as HTMLInputElement).value);
  }

  protected onSearchSubmit(event: Event): void {
    event.preventDefault();
    const term = this.searchValue().trim();

    void this.router.navigate(['/products'], {
      queryParams: term ? { q: term } : {},
    });
    this.closeMenu();
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
