import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';
import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { AccountReferralFacade } from '../../services/account-referral.facade';

@Component({
  selector: 'app-account-referral-page',
  standalone: true,
  imports: [HamboxDatePipe, DecimalPipe, TranslatePipe, HamboxTranslateRefreshDirective],
  templateUrl: './account-referral-page.component.html',
  styleUrl: './account-referral-page.component.scss',
})
export class AccountReferralPageComponent implements OnInit {
  private readonly facade = inject(AccountReferralFacade);

  protected readonly dashboard = this.facade.dashboard;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly inviteLink = this.facade.inviteLink;
  protected readonly tierProgress = this.facade.tierProgress;
  protected readonly copied = this.facade.copied;

  ngOnInit(): void {
    void this.facade.load();
  }

  protected copyLink(): void {
    void this.facade.copyInviteLink();
  }
}
