import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  PointsSummaryApiDto,
  PointsTransactionApiDto,
  PointsTransactionType,
} from '../models/account-api.model';
import { AccountApiService } from './account-api.service';

@Injectable({
  providedIn: 'root',
})
export class AccountPointsFacade {
  private readonly api = inject(AccountApiService);

  private readonly summaryState = signal<PointsSummaryApiDto | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal(false);

  private readonly historyState = signal<readonly PointsTransactionApiDto[]>([]);
  private readonly historyLoadingState = signal(false);
  private readonly historyErrorState = signal(false);
  private readonly typeFilterState = signal<PointsTransactionType | ''>('');
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(10);
  private readonly totalCountState = signal(0);

  readonly summary = this.summaryState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly history = this.historyState.asReadonly();
  readonly historyLoading = this.historyLoadingState.asReadonly();
  readonly historyError = this.historyErrorState.asReadonly();
  readonly typeFilter = this.typeFilterState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCountState() / this.pageSizeState())),
  );

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(false);

    try {
      this.summaryState.set(await firstValueFrom(this.api.getPointsSummary()));
    } catch {
      this.summaryState.set(null);
      this.errorState.set(true);
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadHistory(): Promise<void> {
    this.historyLoadingState.set(true);
    this.historyErrorState.set(false);

    try {
      const type = this.typeFilterState();
      const result = await firstValueFrom(
        this.api.getPointsHistory({
          pageNumber: this.pageNumberState(),
          pageSize: this.pageSizeState(),
          type: type || undefined,
        }),
      );

      this.historyState.set(result.items ?? []);
      this.totalCountState.set(result.totalCount ?? 0);
      this.pageNumberState.set(result.pageNumber ?? this.pageNumberState());
      this.pageSizeState.set(result.pageSize ?? this.pageSizeState());
    } catch {
      this.historyState.set([]);
      this.totalCountState.set(0);
      this.historyErrorState.set(true);
    } finally {
      this.historyLoadingState.set(false);
    }
  }

  setTypeFilter(type: PointsTransactionType | ''): void {
    this.typeFilterState.set(type);
    this.pageNumberState.set(1);
    void this.loadHistory();
  }

  setPage(pageNumber: number): void {
    this.pageNumberState.set(Math.min(Math.max(1, pageNumber), this.totalPages()));
    void this.loadHistory();
  }
}
