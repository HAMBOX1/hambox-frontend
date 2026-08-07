import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-order-referral-banner',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './order-referral-banner.component.html',
  styleUrl: './order-referral-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderReferralBannerComponent {}
