import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductStatus } from '../../models/product.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';

const STATUS_OPTIONS: { label: string; value: ProductStatus }[] = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Archived', value: 'Archived' },
];

@Component({
  selector: 'app-product-publishing-panel',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    SelectModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminStatusBadgeComponent,
  ],
  templateUrl: './product-publishing-panel.component.html',
  styleUrl: './product-publishing-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPublishingPanelComponent {
  private readonly facade = inject(ProductEditorFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly product = this.facade.product;
  protected readonly submitting = this.facade.submitting;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly selectedStatus = signal<ProductStatus>('Draft');

  constructor() {
    effect(() => {
      const product = this.product();
      if (product) {
        this.selectedStatus.set(product.status);
      }
    });
  }

  protected statusTone(status: ProductStatus): 'success' | 'warning' | 'info' | 'neutral' {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Draft':
        return 'info';
      case 'Inactive':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  protected async saveStatus(): Promise<void> {
    await this.facade.updateStatus(this.selectedStatus());
  }

  protected async publish(): Promise<void> {
    this.selectedStatus.set('Active');
    await this.facade.publishProduct();
  }
}
