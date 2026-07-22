import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  HostListener,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductAssetsUploadComponent } from '../../components/product-assets-upload/product-assets-upload.component';
import { ProductBasicInfoFormComponent } from '../../components/product-basic-info-form/product-basic-info-form.component';
import { ProductOptionGroupsPanelComponent } from '../../components/product-option-groups-panel/product-option-groups-panel.component';
import { ProductVariantManagerComponent } from '../../components/product-variant-manager/product-variant-manager.component';
import { ProductStatus, UpdateProductRequest } from '../../models/product.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';

const STATUS_OPTIONS: { label: string; value: ProductStatus }[] = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Archived', value: 'Archived' },
];

@Component({
  selector: 'app-product-edit-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ToastModule,
    ButtonModule,
    SelectModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
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

  private readonly productForm = viewChild('productForm', { read: ProductBasicInfoFormComponent });
  private readonly variantsAnchor = viewChild<ElementRef<HTMLElement>>('variantsAnchor');
  private hasScrolledToFragment = false;

  protected readonly permissions = PERMISSIONS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly product = this.facade.product;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly categories = this.facade.categories;
  protected readonly categoriesLoading = this.facade.categoriesLoading;
  protected readonly formSnapshot = this.facade.formSnapshot;
  protected readonly submitting = this.facade.submitting;
  protected readonly productId = this.facade.productId;
  protected readonly variants = this.facade.variants;
  protected readonly totalVariantCount = this.facade.totalVariantCount;
  protected readonly activeVariantCount = this.facade.activeVariantCount;

  /** True once the owner has actually typed/changed something in the General form since the last save. Drives the floating save bar. */
  protected readonly dirty = computed(() => this.productForm()?.dirty() ?? false);
  private readonly justSavedState = signal(false);
  /** Brief "Saved" flash after a successful save, so the bar doesn't just vanish the instant dirty flips back to false. */
  protected readonly justSaved = this.justSavedState.asReadonly();
  protected readonly showFloatingSaveBar = computed(
    () => this.dirty() || this.submitting() || this.justSaved(),
  );

  private justSavedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.justSavedTimeout !== null) {
        clearTimeout(this.justSavedTimeout);
      }
    });
    effect(() => {
      if (this.hasScrolledToFragment || this.loading() || !this.product()) {
        return;
      }
      if (this.route.snapshot.fragment !== 'variants') {
        return;
      }

      const anchor = this.variantsAnchor();
      if (!anchor) {
        return;
      }

      this.hasScrolledToFragment = true;
      anchor.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

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

  protected onCategoryCreated(): void {
    void this.facade.loadCategories();
  }

  protected onCancel(): void {
    void this.router.navigate(['/admin/products']);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (this.dirty() && !this.submitting()) {
        void this.onSave();
      }
    }
  }

  protected async onSave(navigateAway = false): Promise<void> {
    const product = this.product();
    const form = this.productForm();

    const generalValue = form?.getGeneralValue();
    const price = form?.getPriceValue();

    if (!generalValue || price === null || price === undefined || !product) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation required',
        detail: 'Complete all required fields before saving.',
        life: 5000,
      });
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
      this.flashSaved();
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

  private flashSaved(): void {
    if (this.justSavedTimeout !== null) {
      clearTimeout(this.justSavedTimeout);
    }
    this.justSavedState.set(true);
    this.justSavedTimeout = setTimeout(() => this.justSavedState.set(false), 2000);
  }

  protected async onStatusChange(status: ProductStatus): Promise<void> {
    const updated = await this.facade.updateStatus(status);
    if (updated) {
      this.messageService.add({
        severity: 'success',
        summary: 'Status updated',
        detail: `Product status changed to ${status}.`,
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Status update failed',
      detail: this.facade.submitError() ?? 'Unable to update product status.',
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
