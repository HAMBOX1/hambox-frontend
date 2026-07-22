import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { ApiError } from '../../../../core/models/api-error.model';
import { CategoryCreateFormComponent } from '../category-create-form/category-create-form.component';
import { CategoryOption, CreateCategoryRequest } from '../../models/category.model';
import { CreateProductRequest, ProductDraftFormSnapshot } from '../../models/product.model';
import { CategoryApiService, createCategoryWithHierarchy } from '../../services/category-api.service';

const FIELD_LABELS = {
  nameEn: 'Product name (EN)',
  nameAr: 'Product name (AR)',
  descriptionEn: 'Description (EN)',
  descriptionAr: 'Description (AR)',
  price: 'Price',
  categoryId: 'Category',
} as const;

@Component({
  selector: 'app-product-basic-info-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    SelectModule,
    ButtonModule,
    DialogModule,
    CategoryCreateFormComponent,
  ],
  templateUrl: './product-basic-info-form.component.html',
  styleUrl: './product-basic-info-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductBasicInfoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoryApi = inject(CategoryApiService);

  readonly categories = input<readonly CategoryOption[]>([]);
  readonly categoriesLoading = input(false);
  readonly categoriesError = input<string | null>(null);
  readonly disabled = input(false);
  readonly initialSnapshot = input<ProductDraftFormSnapshot | null>(null);
  readonly section = input<'general' | 'pricing' | 'full'>('full');

  /** Emitted after a category is created inline, so the parent facade can refresh its category list. */
  readonly categoryCreated = output<void>();

  private readonly newlyCreatedCategoryState = signal<CategoryOption | null>(null);
  private readonly categoryDialogOpenState = signal(false);
  private readonly categoryCreatingState = signal(false);
  private readonly categoryCreateErrorState = signal<string | null>(null);
  private readonly categoryFormResetTokenState = signal(0);

  protected readonly categoryDialogOpen = this.categoryDialogOpenState.asReadonly();
  protected readonly categoryCreating = this.categoryCreatingState.asReadonly();
  protected readonly categoryCreateError = this.categoryCreateErrorState.asReadonly();
  protected readonly categoryFormResetToken = this.categoryFormResetTokenState.asReadonly();

  /** categories() plus an optimistic entry for a just-created category, selectable before the parent's refetch lands. */
  protected readonly categoryOptions = computed(() => {
    const base = this.categories();
    const created = this.newlyCreatedCategoryState();

    if (!created || base.some((option) => option.id === created.id)) {
      return base;
    }

    return [...base, created];
  });

  protected readonly form = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required, Validators.maxLength(200)]],
    nameAr: ['', [Validators.maxLength(200)]],
    descriptionEn: ['', [Validators.maxLength(2000)]],
    descriptionAr: ['', [Validators.maxLength(2000)]],
    price: [0, [Validators.required, Validators.min(0)]],
    categoryId: ['', [Validators.required]],
  });

  /** Always collapsed initially; the owner opts in via revealArabic() regardless of existing Arabic content. */
  protected readonly showArabic = signal(false);

  private readonly arabicHasValueState = signal(false);
  /** Drives the "Arabic Translation saved" vs "Add Arabic Translation" label on the collapsed toggle. */
  protected readonly arabicHasValue = this.arabicHasValueState.asReadonly();

  private readonly dirtyState = signal(false);
  /** True once the owner has actually edited a field (never flips on the programmatic patch used to load/reset the form). Drives the page's floating save bar. */
  readonly dirty = this.dirtyState.asReadonly();

  constructor() {
    effect(() => {
      const snapshot = this.initialSnapshot();
      if (snapshot) {
        this.form.patchValue(snapshot, { emitEvent: false });
        this.form.markAsPristine();
        this.dirtyState.set(false);
        const hasArabic = !!(snapshot.nameAr?.trim() || snapshot.descriptionAr?.trim());
        this.arabicHasValueState.set(hasArabic);
      }
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.dirtyState.set(true);
      this.arabicHasValueState.set(!!(value.nameAr?.trim() || value.descriptionAr?.trim()));
    });
  }

  protected revealArabic(): void {
    this.showArabic.set(true);
  }

  protected hideArabic(): void {
    this.showArabic.set(false);
  }

  validate(): boolean {
    this.form.markAllAsTouched();
    return this.form.valid;
  }

  getValue(): CreateProductRequest | null {
    if (this.form.invalid) {
      return null;
    }

    return this.buildRequest();
  }

  getGeneralValue(): Omit<CreateProductRequest, 'price'> | null {
    const controls = ['nameEn', 'nameAr', 'descriptionEn', 'descriptionAr', 'categoryId'] as const;
    controls.forEach((name) => this.form.controls[name].markAsTouched());

    if (controls.some((name) => this.form.controls[name].invalid)) {
      return null;
    }

    const value = this.getDraftSnapshot();
    return {
      nameEn: value.nameEn.trim(),
      nameAr: value.nameAr.trim(),
      descriptionEn: value.descriptionEn.trim(),
      descriptionAr: value.descriptionAr.trim(),
      categoryId: value.categoryId,
    };
  }

  getPriceValue(): number | null {
    this.form.controls.price.markAsTouched();
    if (this.form.controls.price.invalid) {
      return null;
    }

    return this.getDraftSnapshot().price;
  }

  private buildRequest(): CreateProductRequest {
    const value = this.getDraftSnapshot();
    return {
      nameEn: value.nameEn.trim(),
      nameAr: value.nameAr.trim(),
      descriptionEn: value.descriptionEn.trim(),
      descriptionAr: value.descriptionAr.trim(),
      price: value.price,
      categoryId: value.categoryId,
    };
  }

  getDraftSnapshot(): ProductDraftFormSnapshot {
    const value = this.form.getRawValue();

    return {
      nameEn: value.nameEn,
      nameAr: value.nameAr,
      descriptionEn: value.descriptionEn,
      descriptionAr: value.descriptionAr,
      price: value.price,
      categoryId: value.categoryId,
    };
  }

  applyDraftSnapshot(snapshot: ProductDraftFormSnapshot): void {
    this.form.patchValue(snapshot, { emitEvent: false });
    this.form.markAsPristine();
    this.dirtyState.set(false);
    const hasArabic = !!(snapshot.nameAr?.trim() || snapshot.descriptionAr?.trim());
    this.arabicHasValueState.set(hasArabic);
  }

  get valueChanges$(): Observable<typeof this.form.value> {
    return this.form.valueChanges;
  }

  protected fieldError(controlName: keyof typeof FIELD_LABELS): string | null {
    const control = this.form.controls[controlName];

    if (!control.touched || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return `${FIELD_LABELS[controlName]} is required.`;
    }

    if (control.errors['maxlength']) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `${FIELD_LABELS[controlName]} must be ${maxLength} characters or fewer.`;
    }

    if (control.errors['min']) {
      return 'Price must be zero or greater.';
    }

    return 'Invalid value.';
  }

  protected openCategoryDialog(): void {
    this.categoryCreateErrorState.set(null);
    this.categoryFormResetTokenState.update((value) => value + 1);
    this.categoryDialogOpenState.set(true);
  }

  protected closeCategoryDialog(): void {
    this.categoryDialogOpenState.set(false);
    this.categoryCreateErrorState.set(null);
  }

  protected onCategoryDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closeCategoryDialog();
    }
  }

  protected async onCategorySubmitted(request: CreateCategoryRequest): Promise<void> {
    this.categoryCreatingState.set(true);
    this.categoryCreateErrorState.set(null);

    try {
      const id = await createCategoryWithHierarchy(this.categoryApi, request);
      this.newlyCreatedCategoryState.set({ id, label: request.nameEn });
      this.form.controls.categoryId.setValue(id);
      this.categoryDialogOpenState.set(false);
      this.categoryCreated.emit();
    } catch (error) {
      this.categoryCreateErrorState.set(this.toErrorMessage(error, 'Failed to create category.'));
    } finally {
      this.categoryCreatingState.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to manage categories. Sign in with an admin account (admin@hambox.local in development).';
      }

      return error.message;
    }

    return fallback;
  }
}
