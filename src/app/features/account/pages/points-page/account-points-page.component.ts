import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';
import { PointsTransactionType } from '../../models/account-api.model';
import { AccountPointsFacade } from '../../services/account-points.facade';

@Component({
  selector: 'app-account-points-page',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    HamboxDatePipe,
    TranslatePipe,
    HamboxTranslateRefreshDirective,
  ],
  templateUrl: './account-points-page.component.html',
  styleUrl: './account-points-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPointsPageComponent implements OnInit {
  private readonly facade = inject(AccountPointsFacade);

  protected readonly summary = this.facade.summary;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  protected readonly history = this.facade.history;
  protected readonly historyLoading = this.facade.historyLoading;
  protected readonly historyError = this.facade.historyError;
  protected readonly typeFilter = this.facade.typeFilter;
  protected readonly pageNumber = this.facade.pageNumber;
  protected readonly totalPages = this.facade.totalPages;

  protected readonly typeOptions: readonly {
    value: PointsTransactionType | '';
    labelKey: string;
  }[] = [
    { value: '', labelKey: 'ACCOUNT.POINTS_UI.FILTER_ALL' },
    { value: 'Earned', labelKey: 'ACCOUNT.POINTS_UI.TYPE_EARNED' },
    { value: 'Reversed', labelKey: 'ACCOUNT.POINTS_UI.TYPE_REVERSED' },
  ];

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    void this.facade.load();
    void this.facade.loadHistory();
  }

  protected onTypeFilterChange(event: Event): void {
    this.facade.setTypeFilter(
      (event.target as HTMLSelectElement).value as PointsTransactionType | '',
    );
  }

  protected goToPage(page: number): void {
    this.facade.setPage(page);
  }
}
