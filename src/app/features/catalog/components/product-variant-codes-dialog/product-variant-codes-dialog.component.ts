import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { AdminStatusBadgeComponent } from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductVariantDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';

@Component({
  selector: 'app-product-variant-codes-dialog',
  standalone: true,
  imports: [
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    TableModule,
    HasPermissionDirective,
    AdminStatusBadgeComponent,
  ],
  templateUrl: './product-variant-codes-dialog.component.html',
  styleUrl: './product-variant-codes-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductVariantCodesDialogComponent {
  private readonly facade = inject(ProductEditorFacade);

  readonly visible = model(false);
  readonly variant = input<ProductVariantDto | null>(null);

  protected readonly permissions = PERMISSIONS;
  protected readonly batches = this.facade.batches;
  protected readonly codes = this.facade.codes;
  protected readonly statistics = this.facade.statistics;
  protected readonly inventoryLoading = this.facade.inventoryLoading;

  protected readonly newBatchName = signal('');
  protected readonly bulkCodes = signal('');
  protected readonly importing = signal(false);

  protected readonly codesTable = computed(() => [...this.codes()]);

  protected optionSummary(variant: ProductVariantDto): string {
    const labels = this.facade
      .optionGroups()
      .flatMap((group) => group.options)
      .filter((option) => variant.optionIds.includes(option.id))
      .map((option) => option.label);

    return labels.length ? labels.join(' · ') : variant.sku;
  }

  protected async createBatch(): Promise<void> {
    const name = this.newBatchName().trim();
    if (!name) {
      return;
    }

    await this.facade.createBatch({ name, currency: 'USD', purchaseCost: 0 });
    this.newBatchName.set('');
  }

  protected async importCodes(): Promise<void> {
    const batch = this.batches()[0];
    const raw = this.bulkCodes().trim();
    if (!batch || !raw) {
      return;
    }

    const codes = raw.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
    this.importing.set(true);
    try {
      const ok = await this.facade.importCodes(codes);
      if (ok) {
        this.bulkCodes.set('');
      }
    } finally {
      this.importing.set(false);
    }
  }

  protected exportCodes(): void {
    const lines = this.codesTable().map((code) => code.digitalCode);
    if (!lines.length) {
      return;
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `codes-${this.variant()?.sku ?? 'export'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
