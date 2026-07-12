import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';
import { CustomerLibraryItemApiDto } from '../../models/account-api.model';
import { AccountLibraryFacade } from '../../services/account-library.facade';

@Component({
  selector: 'app-account-library-page',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, RouterLink, TranslatePipe, ToastModule, LoadingSkeletonComponent, HamboxDatePipe, HamboxTranslateRefreshDirective],
  providers: [MessageService],
  templateUrl: './account-library-page.component.html',
  styleUrl: './account-library-page.component.scss',
})
export class AccountLibraryPageComponent implements OnInit {
  private readonly facade = inject(AccountLibraryFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);

  protected readonly items = this.facade.items;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly deliveryFilter = this.facade.deliveryFilter;
  protected readonly sort = this.facade.sort;
  protected readonly groupFilter = this.facade.groupFilter;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageNumber = this.facade.pageNumber;
  protected readonly isEmpty = this.facade.isEmpty;
  protected readonly recentItems = this.facade.recentItems;
  protected readonly olderItems = this.facade.olderItems;
  protected readonly showGroupedSections = this.facade.showGroupedSections;
  protected readonly highlightItemId = this.facade.highlightItemId;

  protected readonly instructionsItemId = signal<string | null>(null);
  protected readonly copyFeedbackId = signal<string | null>(null);
  protected readonly pendingRevealItem = signal<CustomerLibraryItemApiDto | null>(null);

  protected readonly deliveryOptions = [
    { labelKey: 'ACCOUNT.LIBRARY_UI.DELIVERY_ALL', value: '' },
    { labelKey: 'ACCOUNT.LIBRARY_UI.DELIVERY_DELIVERED', value: 'Delivered' },
    { labelKey: 'ACCOUNT.LIBRARY_UI.DELIVERY_PENDING', value: 'Pending' },
  ];

  protected readonly sortOptions = [
    { labelKey: 'ACCOUNT.LIBRARY_UI.SORT_RECENT', value: 'recent' },
    { labelKey: 'ACCOUNT.LIBRARY_UI.SORT_OLDEST', value: 'oldest' },
    { labelKey: 'ACCOUNT.LIBRARY_UI.SORT_NAME', value: 'name' },
  ];

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const itemId = params.get('itemId');
      const orderId = params.get('orderId');
      if (itemId) {
        this.facade.setHighlightItemId(itemId);
      } else if (orderId) {
        this.facade.setHighlightItemId(null);
      }
    });
  }

  ngOnInit(): void {
    void this.facade.load().then(() => {
      const itemId = this.route.snapshot.queryParamMap.get('itemId');
      const orderId = this.route.snapshot.queryParamMap.get('orderId');
      if (itemId) {
        this.facade.setHighlightItemId(itemId);
        this.scrollToItem(itemId);
        return;
      }

      if (orderId) {
        const match = this.items().find((item) => item.orderId === orderId);
        if (match) {
          this.facade.setHighlightItemId(match.id);
          this.scrollToItem(match.id);
        }
      }
    });
  }

  protected onSearchInput(event: Event): void {
    this.facade.setSearchTerm((event.target as HTMLInputElement).value);
  }

  protected onDeliveryChange(event: Event): void {
    this.facade.setDeliveryFilter((event.target as HTMLSelectElement).value);
  }

  protected onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'recent' | 'oldest' | 'name';
    this.facade.setSort(value);
  }

  protected setGroup(group: '' | 'recent' | 'older'): void {
    this.facade.setGroupFilter(group);
  }

  protected retry(): void {
    void this.facade.load();
  }

  protected imageUrl(item: CustomerLibraryItemApiDto, index: number): string {
    return this.facade.resolveImageUrl(item.productImageUrl, index);
  }

  protected isKeyRevealed(itemId: string): boolean {
    return this.facade.isKeyRevealed(itemId);
  }

  protected isRevealing(itemId: string): boolean {
    return this.facade.isRevealing(itemId);
  }

  protected requestReveal(item: CustomerLibraryItemApiDto): void {
    if (!item.canReveal) {
      return;
    }

    if (this.isKeyRevealed(item.id)) {
      this.facade.hideKey(item.id);
      return;
    }

    this.pendingRevealItem.set(item);
  }

  protected cancelReveal(): void {
    this.pendingRevealItem.set(null);
  }

  protected async confirmReveal(): Promise<void> {
    const item = this.pendingRevealItem();
    if (!item) {
      return;
    }

    this.pendingRevealItem.set(null);
    const key = await this.facade.revealKey(item.id);
    if (!key) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ACCOUNT.LIBRARY_UI.REVEAL_FAILED_TITLE'),
        detail: this.translate.instant('ACCOUNT.LIBRARY_UI.REVEAL_FAILED_BODY'),
        life: 3000,
      });
    }
  }

  protected displayKey(item: CustomerLibraryItemApiDto): string {
    return this.isKeyRevealed(item.id)
      ? (this.facade.getRevealedKey(item.id) ?? item.maskedLicenseKey)
      : item.maskedLicenseKey;
  }

  protected async copyKey(item: CustomerLibraryItemApiDto): Promise<void> {
    if (!this.isKeyRevealed(item.id)) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('ACCOUNT.LIBRARY_UI.REVEAL_REQUIRED_TITLE'),
        detail: this.translate.instant('ACCOUNT.LIBRARY_UI.REVEAL_REQUIRED_BODY'),
        life: 2500,
      });
      return;
    }

    const copied = await this.facade.copyKey(item.id);
    if (copied) {
      this.copyFeedbackId.set(item.id);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ACCOUNT.LIBRARY_UI.COPIED_TITLE'),
        detail: this.translate.instant('ACCOUNT.LIBRARY_UI.COPIED_BODY'),
        life: 2500,
      });
      setTimeout(() => {
        if (this.copyFeedbackId() === item.id) {
          this.copyFeedbackId.set(null);
        }
      }, 2000);
    }
  }

  protected toggleInstructions(itemId: string): void {
    this.instructionsItemId.update((current) => (current === itemId ? null : itemId));
  }

  protected instructionsOpen(itemId: string): boolean {
    return this.instructionsItemId() === itemId;
  }

  protected metaValue(value: string | null): string {
    return value?.trim() ? value : '—';
  }

  protected totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount() / this.facade.pageSize()));
  }

  protected goToPage(page: number): void {
    this.facade.setPage(page);
  }

  private scrollToItem(itemId: string): void {
    queueMicrotask(() => {
      document.getElementById(`library-item-${itemId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }
}
