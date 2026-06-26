import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { CartNavWidgetComponent } from '../../../cart/components/cart-nav-widget/cart-nav-widget.component';
import { Auth } from '../../../auth/services/auth';
import { NavLink } from '../../models/storefront-home';
import { LanguageSwitcherComponent } from '../../../../shared/components/language-switcher/language-switcher.component';
import { CurrencySwitcherComponent } from '../../../../shared/components/currency-switcher/currency-switcher.component';
import { ThemeToggleComponent } from '../../../../shared/components/theme-toggle/theme-toggle.component';
import { StorefrontNavMode } from '../../../../shared/components/storefront-nav/storefront-nav.model';

@Component({
  selector: 'app-top-nav-user',
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
  templateUrl: './top-nav-user.component.html',
  styleUrl: './top-nav-user.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopNavUserComponent {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly accountMenu = viewChild<ElementRef<HTMLElement>>('accountMenu');

  links = input.required<readonly NavLink[]>();
  mode = input<StorefrontNavMode>('storefront');
  compact = input(false);
  elevated = input(false);

  protected readonly logoSrc = 'assets/images/top-nav/hambox-title.png';
  protected readonly searchIconSrc = 'assets/images/top-nav/search-icon.svg';

  protected readonly searchValue = signal('');
  protected readonly menuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);

  protected readonly avatarInitial = computed(() => {
    const user = this.auth.user();
    const source = user?.firstName || user?.email || 'U';
    return source.charAt(0).toUpperCase();
  });

  protected readonly isLoggingOut = signal(false);

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.userMenuOpen()) {
      return;
    }

    const menu = this.accountMenu()?.nativeElement;
    if (menu && !menu.contains(event.target as Node)) {
      this.closeUserMenu();
    }
  }

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
    this.closeUserMenu();
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.update((open) => !open);
  }

  protected closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  protected logout(): void {
    if (this.isLoggingOut()) {
      return;
    }

    this.isLoggingOut.set(true);
    this.auth.logout().subscribe({
      next: () => {
        this.isLoggingOut.set(false);
        this.closeUserMenu();
        this.closeMenu();
        void this.router.navigate(['/home']);
      },
      error: () => {
        this.isLoggingOut.set(false);
        this.closeUserMenu();
        this.closeMenu();
        void this.router.navigate(['/home']);
      },
    });
  }
}
