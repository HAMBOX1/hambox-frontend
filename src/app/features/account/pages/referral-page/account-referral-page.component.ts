import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';

import { AccountReferralFacade } from '../../services/account-referral.facade';

@Component({
  selector: 'app-account-referral-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './account-referral-page.component.html',
  styleUrl: './account-referral-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
