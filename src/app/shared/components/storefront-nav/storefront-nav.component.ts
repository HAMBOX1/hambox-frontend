import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';

import { TopNavGuestComponent } from '../../../features/home/components/top-nav-guest/top-nav-guest.component';
import { TopNavUserComponent } from '../../../features/home/components/top-nav-user/top-nav-user.component';
import { Auth } from '../../../features/auth/services/auth';
import { NavLink } from '../../../features/home/models/storefront-home';
import { MobileTopBarComponent } from '../mobile-top-bar/mobile-top-bar.component';
import { StorefrontNavMode } from './storefront-nav.model';

const COMPACT_SCROLL_OFFSET = 80;

@Component({
  selector: 'app-storefront-nav',
  standalone: true,
  imports: [TopNavGuestComponent, TopNavUserComponent, MobileTopBarComponent],
  template: `
    <app-mobile-top-bar [mode]="mode()" />

    <div class="storefront-nav__desktop">
      @if (auth.isAuthenticated()) {
        <app-top-nav-user [links]="links()" [mode]="mode()" [compact]="compact()" [elevated]="elevated()" />
      } @else {
        <app-top-nav-guest [links]="links()" [mode]="mode()" [compact]="compact()" [elevated]="elevated()" />
      }
    </div>
  `,
  styles: `
    .storefront-nav__desktop {
      display: block;
    }

    @media (max-width: 767px) {
      .storefront-nav__desktop {
        display: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontNavComponent {
  readonly links = input.required<readonly NavLink[]>();
  readonly mode = input<StorefrontNavMode>('storefront');

  protected readonly auth = inject(Auth);
  protected readonly compact = signal(false);
  protected readonly elevated = signal(false);

  private lastScrollY = 0;

  constructor() {
    afterNextRender(() => {
      this.lastScrollY = window.scrollY;
      this.onWindowScroll();
    });
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    if (this.mode() !== 'storefront') {
      this.compact.set(false);
      this.elevated.set(false);
      return;
    }

    const scrollY = window.scrollY;
    const scrollDelta = scrollY - this.lastScrollY;

    this.elevated.set(scrollY > 0);

    if (scrollY <= COMPACT_SCROLL_OFFSET) {
      this.compact.set(false);
    } else if (scrollDelta > 4) {
      this.compact.set(true);
    } else if (scrollDelta < -4) {
      this.compact.set(false);
    }

    this.lastScrollY = scrollY;
  }
}
