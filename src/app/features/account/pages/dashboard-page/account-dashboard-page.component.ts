import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { AccountDashboardFacade } from '../../services/account-dashboard.facade';
import { AccountNotificationsFacade } from '../../services/account-notifications.facade';
import { AccountWishlistFacade } from '../../services/account-wishlist.facade';
import { referralInviteLink, referralTierProgress } from '../../utils/referral-tier.util';
import { resolveWishlistItemImageUrl } from '../../utils/wishlist-image.util';

@Component({
  selector: 'app-account-dashboard-page',
  standalone: true,
  imports: [RouterLink, HamboxCurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './account-dashboard-page.component.html',
  styleUrl: './account-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDashboardPageComponent implements OnInit {
  private readonly facade = inject(AccountDashboardFacade);
  private readonly notificationsFacade = inject(AccountNotificationsFacade);
  private readonly wishlistFacade = inject(AccountWishlistFacade);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly membership = this.facade.membership;
  protected readonly wishlistPreview = this.facade.wishlistPreview;
  protected readonly referral = this.facade.referral;
  protected readonly recentActivity = this.facade.recentActivity;
  protected readonly copiedInvite = signal(false);

  protected readonly displayName = computed(() => {
    const user = this.session.user();
    return user?.firstName || user?.email?.split('@')[0] || 'Gamer';
  });

  protected readonly referralProgress = computed(() => {
    const ref = this.referral();
    if (!ref) {
      return 0;
    }

    return referralTierProgress(ref.tier, ref.lifetimePoints);
  });

  protected itemImageUrl(imageUrl: string | null | undefined, index: number): string {
    return resolveWishlistItemImageUrl(imageUrl, index);
  }

  ngOnInit(): void {
    void this.facade.load();
  }

  protected retry(): void {
    void this.facade.load();
  }

  protected async copyInviteLink(): Promise<void> {
    const code = this.referral()?.referralCode;
    if (!code || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(referralInviteLink(code));
    this.copiedInvite.set(true);
    setTimeout(() => this.copiedInvite.set(false), 2000);
  }

  protected async markAllRead(): Promise<void> {
    await this.notificationsFacade.markAllRead();
    await this.facade.load();
  }

  protected async moveToCart(productId: string): Promise<void> {
    await this.wishlistFacade.moveToCart(productId);
    await this.facade.load();
    void this.router.navigate(['/cart']);
  }
}
