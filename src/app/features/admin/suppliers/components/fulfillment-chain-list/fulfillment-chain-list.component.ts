import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import {
  AdminEmptyStateComponent,
  AdminLoadingSkeletonComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { SupplierFulfillmentChainCandidateDto } from '../../models/supplier.model';

/**
 * Read-only-by-default ordered display of every eligible supplier mapping for a product/variant —
 * the "why is/isn't this automatically fulfillable" view. Variant-specific mappings are always listed
 * before product-wide ones (the array is expected pre-sorted by the backend, matching
 * `FulfillmentRouter`'s own resolution order — this component never re-sorts). When `reorderable` is
 * true, drag-and-drop (the same `@angular/cdk/drag-drop` primitive already used for option-group
 * reordering) lets an admin propose a new order; the backend remains the sole authority — this
 * component only emits the proposed order via `reordered`, it never mutates `candidates` itself.
 */
@Component({
  selector: 'app-fulfillment-chain-list',
  standalone: true,
  imports: [DragDropModule, TranslatePipe, AdminEmptyStateComponent, AdminLoadingSkeletonComponent, AdminStatusBadgeComponent],
  templateUrl: './fulfillment-chain-list.component.html',
  styleUrl: './fulfillment-chain-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FulfillmentChainListComponent {
  readonly candidates = input.required<readonly SupplierFulfillmentChainCandidateDto[]>();
  readonly loading = input(false);
  readonly reorderable = input(false);
  readonly saving = input(false);

  readonly reordered = output<readonly SupplierFulfillmentChainCandidateDto[]>();

  protected readonly hasCandidates = computed(() => this.candidates().length > 0);

  protected onDrop(event: CdkDragDrop<readonly SupplierFulfillmentChainCandidateDto[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const reordered = [...this.candidates()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.reordered.emit(reordered);
  }

  protected scopeTone(scope: string): 'info' | 'neutral' {
    return scope === 'VariantSpecific' ? 'info' : 'neutral';
  }

  protected readinessTone(isReady: boolean): 'success' | 'warning' {
    return isReady ? 'success' : 'warning';
  }

  /** Safe, specific reason a candidate isn't ready — never anything derived from credential values. */
  protected notReadyReasonKey(candidate: SupplierFulfillmentChainCandidateDto): string {
    if (!candidate.supplierEnabled) {
      return 'ADMIN.FULFILLMENT.CHAIN.NOT_READY_DISABLED';
    }

    if (!candidate.providerRegistered) {
      return 'ADMIN.FULFILLMENT.CHAIN.NOT_READY_PROVIDER';
    }

    if (!candidate.credentialsConfigured) {
      return 'ADMIN.FULFILLMENT.CHAIN.NOT_READY_CREDENTIALS';
    }

    return 'ADMIN.FULFILLMENT.CHAIN.NOT_READY_OTHER';
  }
}
