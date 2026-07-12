import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminStickySaveBarComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductAssetsUploadComponent } from '../../components/product-assets-upload/product-assets-upload.component';
import { ProductBasicInfoFormComponent } from '../../components/product-basic-info-form/product-basic-info-form.component';
import { ProductOptionGroupsPanelComponent } from '../../components/product-option-groups-panel/product-option-groups-panel.component';
import { ProductVariantManagerComponent } from '../../components/product-variant-manager/product-variant-manager.component';
import { ProductStatus, UpdateProductRequest } from '../../models/product.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';

@Component({
  selector: 'app-product-edit-page',
  standalone: true,
  imports: [
    RouterLink,
    ToastModule,
    ButtonModule,
    TabsModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStickySaveBarComponent,
    AdminStatusBadgeComponent,
    ProductBasicInfoFormComponent,
    ProductAssetsUploadComponent,
    ProductOptionGroupsPanelComponent,
    ProductVariantManagerComponent,
  ],
  providers: [ProductEditorFacade, MessageService],
  templateUrl: './product-edit-page.component.html',
  styleUrl: './product-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductEditPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(ProductEditorFacade);
  private readonly messageService = inject(MessageService);

  private readonly generalForm = viewChild('generalForm', { read: ProductBasicInfoFormComponent });
  private readonly pricingForm = viewChild('pricingForm', { read: ProductBasicInfoFormComponent });

  protected readonly permissions = PERMISSIONS;
  protected readonly activeTab = signal('general');
  protected readonly product = this.facade.product;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly categories = this.facade.categories;
  protected readonly categoriesLoading = this.facade.categoriesLoading;
  protected readonly formSnapshot = this.facade.formSnapshot;
  protected readonly submitting = this.facade.submitting;
  protected readonly productId = this.facade.productId;
  protected readonly variants = this.facade.variants;

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (!productId) {
      void this.router.navigate(['/admin/products']);
      return;
    }

    void this.facade.load(productId);
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

  protected onTabChange(value: string | number | undefined): void {
    this.activeTab.set(String(value ?? 'general'));
  }

  protected onCancel(): void {
    void this.router.navigate(['/admin/products']);
  }

  protected async onSave(navigateAway = false): Promise<void> {
    const product = this.product();
    const general = this.generalForm();
    const pricing = this.pricingForm();

    const generalValue = general?.getGeneralValue();
    const price = pricing?.getPriceValue() ?? general?.getPriceValue();

    if (!generalValue || price === null || price === undefined || !product) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation required',
        detail: 'Complete all required fields in General and Pricing before saving.',
        life: 5000,
      });
      if (this.activeTab() !== 'general' && this.activeTab() !== 'pricing') {
        this.activeTab.set('general');
      }
      return;
    }

    const updateRequest: UpdateProductRequest = {
      ...generalValue,
      price,
      status: product.status,
    };

    const saved = await this.facade.updateProduct(updateRequest);
    if (saved) {
      this.messageService.add({
        severity: 'success',
        summary: 'Product saved',
        detail: `"${updateRequest.nameEn}" was updated successfully.`,
        life: 4000,
      });
      if (navigateAway) {
        void this.router.navigate(['/admin/products']);
      }
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Save failed',
      detail: this.facade.submitError() ?? 'Unable to update product.',
      life: 5000,
    });
  }

  protected async onPublish(): Promise<void> {
    const saved = await this.facade.publishProduct();
    if (saved) {
      this.messageService.add({
        severity: 'success',
        summary: 'Product published',
        detail: 'This product is now active on the storefront.',
        life: 4000,
      });
    }
  }
}
