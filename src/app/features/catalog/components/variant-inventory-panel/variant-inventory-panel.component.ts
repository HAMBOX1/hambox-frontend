import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminConfirmDialogComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { DigitalInventoryCodeDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';

const REVEAL_AUTO_HIDE_MS = 30_000;

const CODE_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Available', value: 'Available' },
  { label: 'Reserved', value: 'Reserved' },
  { label: 'Sold', value: 'Sold' },
  { label: 'Expired', value: 'Expired' },
  { label: 'Disabled', value: 'Disabled' },
];

@Component({
  selector: 'app-variant-inventory-panel',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    TableModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminStatusBadgeComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminConfirmDialogComponent,
    AdminDataTableShellComponent,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './variant-inventory-panel.component.html',
  styleUrl: './variant-inventory-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantInventoryPanelComponent {
  private readonly facade = inject(ProductEditorFacade);
  private readonly messageService = inject(MessageService);
  private revealTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  protected readonly permissions = PERMISSIONS;
  protected readonly selectedVariant = this.facade.selectedVariant;
  protected readonly selectedBatchId = this.facade.selectedBatchId;
  protected readonly batchesTable = computed(() => [...this.facade.batches()]);
  protected readonly batchOptions = computed(() =>
    this.batchesTable().map((batch) => ({
      label: `${batch.name} (${batch.availableCodes} available)`,
      value: batch.id,
    })),
  );
  protected readonly codesTable = computed(() => [...this.facade.codes()]);
  protected readonly inventoryLoading = this.facade.inventoryLoading;
  protected readonly statusOptions = CODE_STATUS_OPTIONS;
  protected readonly codesPage = this.facade.codesPage;
  protected readonly codesPageSize = this.facade.codesPageSize;
  protected readonly codesHasMore = this.facade.codesHasMore;

  protected readonly newBatchName = signal('');
  protected readonly bulkCodes = signal('');
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('');
  protected readonly importing = signal(false);
  protected readonly creatingBatch = signal(false);
  protected readonly actionLoading = signal(false);
  protected readonly selectedCodeIds = signal<string[]>([]);
  protected readonly bulkDeleteDialogOpen = signal(false);

  protected readonly revealDialogOpen = signal(false);
  protected readonly revealTargetCode = signal<DigitalInventoryCodeDto | null>(null);
  protected readonly revealing = signal(false);
  protected readonly revealedCodeId = signal<string | null>(null);
  protected readonly revealedValue = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.hideRevealed());
  }

  protected onBatchChange(batchId: string): void {
    this.hideRevealed();
    this.facade.selectBatch(batchId);
  }

  protected async applyFilters(): Promise<void> {
    const variantId = this.selectedVariant()?.id;
    if (!variantId) {
      return;
    }

    await this.reloadCodes(variantId, 1);
  }

  protected async previousPage(): Promise<void> {
    const variantId = this.selectedVariant()?.id;
    const page = this.codesPage();
    if (!variantId || page <= 1) {
      return;
    }

    await this.reloadCodes(variantId, page - 1);
  }

  protected async nextPage(): Promise<void> {
    const variantId = this.selectedVariant()?.id;
    if (!variantId || !this.codesHasMore()) {
      return;
    }

    await this.reloadCodes(variantId, this.codesPage() + 1);
  }

  protected toggleCodeSelection(codeId: string, checked: boolean): void {
    this.selectedCodeIds.update((current) =>
      checked ? [...new Set([...current, codeId])] : current.filter((id) => id !== codeId),
    );
  }

  protected toggleSelectAll(checked: boolean): void {
    this.selectedCodeIds.set(checked ? this.codesTable().map((code) => code.id) : []);
  }

  protected async createBatch(): Promise<void> {
    const variant = this.selectedVariant();
    const name = this.newBatchName().trim();
    if (!variant || !name) {
      return;
    }

    this.creatingBatch.set(true);
    try {
      await this.facade.createBatch({
        name,
        currency: 'USD',
        purchaseCost: 0,
      });
      this.newBatchName.set('');
    } finally {
      this.creatingBatch.set(false);
    }
  }

  protected async importCodes(): Promise<void> {
    const variant = this.selectedVariant();
    const batchId = this.selectedBatchId();
    const raw = this.bulkCodes().trim();
    if (!variant || !batchId || !raw) {
      return;
    }

    const codes = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    this.importing.set(true);
    try {
      const ok = await this.facade.importCodes(codes, batchId);
      if (ok) {
        this.bulkCodes.set('');
      }
    } finally {
      this.importing.set(false);
    }
  }

  protected onFileSelected(event: Event, kind: 'txt' | 'csv'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const lines =
        kind === 'csv'
          ? text
              .split(/\r?\n/)
              .map((line) => line.split(',')[0]?.trim() ?? '')
              .filter(Boolean)
          : text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      this.bulkCodes.set(lines.join('\n'));
      input.value = '';
    };
    reader.readAsText(file);
  }

  protected async exportCodes(): Promise<void> {
    const variant = this.selectedVariant();
    if (!variant) {
      return;
    }

    this.actionLoading.set(true);
    try {
      const blob = await this.facade.exportCodes(this.statusFilter() || undefined);
      if (!blob) {
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `inventory-codes-${variant.sku}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      this.actionLoading.set(false);
    }
  }

  protected async disableCode(code: DigitalInventoryCodeDto): Promise<void> {
    this.actionLoading.set(true);
    try {
      await this.facade.disableCode(code.id);
    } finally {
      this.actionLoading.set(false);
    }
  }

  protected async enableCode(code: DigitalInventoryCodeDto): Promise<void> {
    this.actionLoading.set(true);
    try {
      await this.facade.enableCode(code.id);
    } finally {
      this.actionLoading.set(false);
    }
  }

  protected async deleteCode(code: DigitalInventoryCodeDto): Promise<void> {
    this.actionLoading.set(true);
    try {
      await this.facade.deleteCode(code.id);
    } finally {
      this.actionLoading.set(false);
    }
  }

  protected async bulkDisableSelected(): Promise<void> {
    const codeIds = this.selectedCodeIds();
    if (!codeIds.length) {
      return;
    }

    this.actionLoading.set(true);
    try {
      await this.facade.bulkDisableCodes(codeIds);
      this.selectedCodeIds.set([]);
    } finally {
      this.actionLoading.set(false);
    }
  }

  protected requestBulkDelete(): void {
    if (this.selectedCodeIds().length) {
      this.bulkDeleteDialogOpen.set(true);
    }
  }

  protected async confirmBulkDelete(): Promise<void> {
    const codeIds = this.selectedCodeIds();
    if (!codeIds.length) {
      return;
    }

    this.actionLoading.set(true);
    try {
      await this.facade.bulkDeleteCodes(codeIds);
      this.selectedCodeIds.set([]);
      this.bulkDeleteDialogOpen.set(false);
    } finally {
      this.actionLoading.set(false);
    }
  }

  protected batchName(batchId: string): string {
    return this.batchesTable().find((batch) => batch.id === batchId)?.name ?? batchId;
  }

  protected requestReveal(code: DigitalInventoryCodeDto): void {
    this.revealTargetCode.set(code);
    this.revealDialogOpen.set(true);
  }

  protected async confirmReveal(): Promise<void> {
    const code = this.revealTargetCode();
    if (!code) {
      return;
    }

    this.revealing.set(true);
    try {
      const plaintext = await this.facade.revealCode(code.id);
      if (plaintext) {
        this.showRevealed(code.id, plaintext);
      }
    } finally {
      this.revealing.set(false);
      this.revealDialogOpen.set(false);
      this.revealTargetCode.set(null);
    }
  }

  protected async copyRevealed(): Promise<void> {
    const value = this.revealedValue();
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    this.messageService.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'Inventory code copied to clipboard.',
    });
  }

  protected hideRevealed(): void {
    if (this.revealTimeoutHandle !== null) {
      clearTimeout(this.revealTimeoutHandle);
      this.revealTimeoutHandle = null;
    }

    this.revealedCodeId.set(null);
    this.revealedValue.set(null);
  }

  private showRevealed(codeId: string, plaintext: string): void {
    this.hideRevealed();
    this.revealedCodeId.set(codeId);
    this.revealedValue.set(plaintext);
    this.revealTimeoutHandle = setTimeout(() => this.hideRevealed(), REVEAL_AUTO_HIDE_MS);
  }

  private async reloadCodes(variantId: string, pageNumber: number): Promise<void> {
    this.hideRevealed();
    await this.facade.selectVariant(variantId, {
      status: this.statusFilter() || undefined,
      searchTerm: this.searchTerm().trim() || undefined,
      pageNumber,
      pageSize: this.codesPageSize(),
    });
  }
}
