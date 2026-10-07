import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { AdminPageHeaderComponent } from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';
import { DeletedInventoryCodeDto } from '../../models/inventory-api.model';
import { InventoryApiService } from '../../services/inventory-api.service';

const PAGE_SIZE = 25;

/**
 * Archive of every inventory code that was ever deleted. Visible to the primary admin (Owner) only: the page is
 * behind an owner-only route and the API refuses everyone else. A code can be put back into stock from here.
 */
@Component({
  selector: 'app-deleted-codes-page',
  standalone: true,
  imports: [DatePipe, FormsModule, ButtonModule, InputTextModule, ToastModule, AdminPageHeaderComponent],
  providers: [MessageService],
  templateUrl: './deleted-codes-page.component.html',
  styleUrl: './deleted-codes-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeletedCodesPageComponent implements OnInit {
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly messages = inject(MessageService);

  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Deleted Codes' });

  protected readonly items = signal<readonly DeletedInventoryCodeDto[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly revealed = signal<ReadonlySet<string>>(new Set());
  protected readonly busyId = signal<string | null>(null);

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.totalCount() / PAGE_SIZE)));

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    void this.load();
  }

  protected onSearch(term: string): void {
    this.searchTerm.set(term);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      void this.load();
    }, 350);
  }

  protected goToPage(next: number): void {
    const clamped = Math.min(this.pageCount(), Math.max(1, next));
    if (clamped !== this.page()) {
      this.page.set(clamped);
      void this.load();
    }
  }

  protected isRevealed(id: string): boolean {
    return this.revealed().has(id);
  }

  protected toggleReveal(id: string): void {
    this.revealed.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /** Whole code hidden until revealed: a multi-line account block would otherwise show passwords in a list. */
  protected shownCode(item: DeletedInventoryCodeDto): string {
    return this.isRevealed(item.id) ? item.digitalCode : '••••••••••';
  }

  protected async restore(item: DeletedInventoryCodeDto): Promise<void> {
    if (this.busyId()) {
      return;
    }

    if (!confirm(`Put this code back into stock for "${item.productName ?? 'its product'}" (${item.variantSku ?? 'variant'})?`)) {
      return;
    }

    this.busyId.set(item.id);
    try {
      await firstValueFrom(this.inventoryApi.restoreDeletedCode(item.id));
      this.messages.add({ severity: 'success', summary: 'Code restored to stock', life: 3500 });
      await this.load();
    } catch (error) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not restore the code',
        detail: error instanceof ApiError && error.message ? error.message : 'Please try again.',
        life: 7000,
      });
    } finally {
      this.busyId.set(null);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await firstValueFrom(
        this.inventoryApi.getDeletedCodes(this.searchTerm().trim(), this.page(), PAGE_SIZE),
      );
      this.items.set(result.items);
      this.totalCount.set(result.totalCount);
      this.revealed.set(new Set());
    } catch {
      this.items.set([]);
      this.totalCount.set(0);
      this.messages.add({ severity: 'error', summary: 'Could not load the deleted codes', life: 5000 });
    } finally {
      this.loading.set(false);
    }
  }
}
