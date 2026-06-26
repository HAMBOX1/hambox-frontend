import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';

import { ProductAssetsUploadComponent } from '../../components/product-assets-upload/product-assets-upload.component';
import { ProductBasicInfoFormComponent } from '../../components/product-basic-info-form/product-basic-info-form.component';
import { UpdateProductRequest } from '../../models/product.model';
import { ProductEditFacade } from '../../services/product-edit.facade';

@Component({
  selector: 'app-product-edit-page',
  standalone: true,
  imports: [
    RouterLink,
    ToastModule,
    ButtonModule,
    ProductBasicInfoFormComponent,
    ProductAssetsUploadComponent,
  ],
  providers: [ProductEditFacade, MessageService],
  templateUrl: './product-edit-page.component.html',
  styleUrl: './product-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductEditPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(ProductEditFacade);
  private readonly messageService = inject(MessageService);

  private readonly basicInfoForm = viewChild(ProductBasicInfoFormComponent);
  private readonly assetsUpload = viewChild(ProductAssetsUploadComponent);

  protected readonly product = this.facade.product;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly categories = this.facade.categories;
  protected readonly categoriesLoading = this.facade.categoriesLoading;
  protected readonly categoriesError = this.facade.error;
  protected readonly submitting = this.facade.submitting;
  protected readonly productId = this.facade.productId;

  constructor() {
    afterNextRender(() => {
      const productId = this.route.snapshot.paramMap.get('id');

      if (!productId) {
        void this.router.navigate(['/admin/inventory']);
        return;
      }

      void this.facade.load(productId).then(() => {
        const product = this.facade.product();

        if (!product) {
          return;
        }

        this.basicInfoForm()?.applyDraftSnapshot({
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          descriptionEn: product.descriptionEn,
          descriptionAr: product.descriptionAr,
          price: product.price,
          categoryId: product.categoryId,
        });

        if (product.images?.length) {
          this.assetsUpload()?.loadPersistedImages(product.images);
        }
      });
    });
  }

  protected onCancel(): void {
    void this.router.navigate(['/admin/inventory']);
  }

  protected async onSave(): Promise<void> {
    const form = this.basicInfoForm();
    const product = this.product();

    if (!form?.validate() || !product) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation required',
        detail: 'Complete all required basic information fields before saving.',
        life: 5000,
      });
      return;
    }

    const request = form.getValue();

    if (!request) {
      return;
    }

    const updateRequest: UpdateProductRequest = {
      ...request,
      status: product.status,
    };

    const saved = await this.facade.updateProduct(product.id, updateRequest);

    if (saved) {
      this.messageService.add({
        severity: 'success',
        summary: 'Product updated',
        detail: `"${request.nameEn}" was saved successfully.`,
        life: 4000,
      });
      void this.router.navigate(['/admin/inventory']);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Update failed',
      detail: this.facade.submitError() ?? 'Unable to update product.',
      life: 5000,
    });
  }
}
