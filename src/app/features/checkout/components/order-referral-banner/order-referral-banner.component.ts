import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-order-referral-banner',
  standalone: true,
  templateUrl: './order-referral-banner.component.html',
  styleUrl: './order-referral-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderReferralBannerComponent {}
