import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';
import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { AccountReferralFacade } from '../../services/account-referral.facade';

@Component({
  selector: 'app-account-referral-page',
  standalone: true,
  imports: [FormsModule, HamboxDatePipe, HamboxCurrencyPipe, DecimalPipe, TranslatePipe, HamboxTranslateRefreshDirective],
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
  protected readonly lifetimePointsValue = this.facade.lifetimePointsValue;

  protected readonly history = this.facade.history;
  protected readonly historyLoading = this.facade.historyLoading;
  protected readonly search = this.facade.search;
  protected readonly statusFilter = this.facade.statusFilter;
  protected readonly pageNumber = this.facade.pageNumber;
  protected readonly totalPages = this.facade.totalPages;

  protected readonly statusOptions = [
    { value: '', labelKey: 'ACCOUNT.REFERRAL_UI.STATUS_ALL' },
    { value: 'Pending', labelKey: 'ACCOUNT.REFERRAL_UI.STATUS_PENDING' },
    { value: 'Qualified', labelKey: 'ACCOUNT.REFERRAL_UI.STATUS_QUALIFIED' },
    { value: 'Rewarded', labelKey: 'ACCOUNT.REFERRAL_UI.STATUS_REWARDED' },
    { value: 'Expired', labelKey: 'ACCOUNT.REFERRAL_UI.STATUS_EXPIRED' },
    { value: 'Reversed', labelKey: 'ACCOUNT.REFERRAL_UI.STATUS_REVERSED' },
  ];

  ngOnInit(): void {
    void this.facade.load();
    void this.facade.loadHistory();
  }

  protected copyLink(): void {
    void this.facade.copyInviteLink();
  }

  protected onSearchInput(event: Event): void {
    this.facade.setSearch((event.target as HTMLInputElement).value);
  }

  protected onStatusFilterChange(event: Event): void {
    this.facade.setStatusFilter((event.target as HTMLSelectElement).value);
  }

  protected goToPage(page: number): void {
    this.facade.setPage(page);
  }

  protected statusClass(status: string): string {
    return `referral-history__status referral-history__status--${status.toLowerCase()}`;
  }
}
