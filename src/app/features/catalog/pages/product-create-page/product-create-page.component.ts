import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { debounceTime, interval, merge, Subject } from 'rxjs';

import {
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStickySaveBarComponent,
} from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';
import { ProductAssetsUploadComponent } from '../../components/product-assets-upload/product-assets-upload.component';
import { ProductBasicInfoFormComponent } from '../../components/product-basic-info-form/product-basic-info-form.component';
import { ProductCreateStepperComponent } from '../../components/product-create-stepper/product-create-stepper.component';
import { PRODUCT_CREATE_STEPS, ProductCreateStepId } from '../../models/product.model';
import { ProductCreateFacade } from '../../services/product-create.facade';
import { ProductDraftService } from '../../services/product-draft.service';

const DRAFT_DEBOUNCE_MS = 1000;
const DRAFT_INTERVAL_MS = 30_000;

@Component({
  selector: 'app-product-create-page',
  standalone: true,
  imports: [
    ToastModule,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminStickySaveBarComponent,
    ProductCreateStepperComponent,
    ProductBasicInfoFormComponent,
    ProductAssetsUploadComponent,
  ],
  providers: [ProductCreateFacade, MessageService],
  templateUrl: './product-create-page.component.html',
  styleUrl: './product-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCreatePageComponent implements OnInit {
  private readonly facade = inject(ProductCreateFacade);
  private readonly draftService = inject(ProductDraftService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly basicInfoForm = viewChild(ProductBasicInfoFormComponent);
  private readonly assetsUpload = viewChild(ProductAssetsUploadComponent);
  private readonly assetsChanged$ = new Subject<void>();

  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Products', route: '/admin/products' },
    { label: 'Create Product' },
  );
  protected readonly steps = PRODUCT_CREATE_STEPS;
  protected readonly activeStep = signal<ProductCreateStepId>('basic-information');

  protected readonly categories = this.facade.categories;
  protected readonly categoriesLoading = this.facade.categoriesLoading;
  protected readonly categoriesError = this.facade.categoriesError;
  protected readonly submitting = this.facade.submitting;

  protected readonly draftBanner = this.draftService.bannerText;
  protected readonly showDraftBanner = this.draftService.showBanner;
  protected readonly draftSaving = this.draftService.saving;
  protected readonly publishToStorefront = signal(true);

  constructor() {
    afterNextRender(() => {
      this.restoreDraft();
      this.setupDraftAutoSave();
    });
  }

  ngOnInit(): void {
    void this.facade.loadCategories();
  }

  protected onStepSelect(stepId: ProductCreateStepId): void {
    this.activeStep.set(stepId);
    this.persistDraft();
  }

  protected onAssetsChanged(): void {
    this.assetsChanged$.next();
  }

  protected onCancel(): void {
    void this.router.navigate(['/admin/products']);
  }

  protected async onCreate(): Promise<void> {
    const form = this.basicInfoForm();

    if (!form?.validate()) {
      this.activeStep.set('basic-information');
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation required',
        detail: 'Complete all required basic information fields before creating the product.',
        life: 5000,
      });
      return;
    }

    const request = form.getValue();

    if (!request) {
      return;
    }

    const createdId = await this.facade.createProduct(request, {
      publish: this.publishToStorefront(),
      imageFiles: this.assetsUpload()?.getPendingFiles() ?? [],
    });

    if (createdId) {
      this.draftService.clearDraft();
      const published = this.publishToStorefront();
      this.messageService.add({
        severity: 'success',
        summary: 'Product created',
        detail: published
          ? `"${request.nameEn}" was published to the storefront.`
          : `"${request.nameEn}" was saved as a draft.`,
        life: 4000,
      });
      void this.router.navigate(['/admin/products', createdId, 'edit']);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Create failed',
      detail: this.facade.submitError() ?? 'Unable to create product.',
      life: 5000,
    });
  }

  private setupDraftAutoSave(): void {
    const form = this.basicInfoForm();

    if (!form) {
      return;
    }

    merge(form.valueChanges$, this.assetsChanged$)
      .pipe(debounceTime(DRAFT_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.persistDraft();
      });

    interval(DRAFT_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.persistDraft();
      });
  }

  private restoreDraft(): void {
    const draft = this.draftService.restoreDraft();

    if (!draft) {
      return;
    }

    this.activeStep.set(draft.activeStep);
    this.basicInfoForm()?.applyDraftSnapshot(draft);
    this.assetsUpload()?.applyAssetMetadata(draft.assets);
  }

  private persistDraft(): void {
    const form = this.basicInfoForm();
    const assets = this.assetsUpload();

    if (!form) {
      return;
    }

    this.draftService.saveDraft({
      ...form.getDraftSnapshot(),
      activeStep: this.activeStep(),
      assets: assets?.getAssetMetadata() ?? [],
    });
  }
}
