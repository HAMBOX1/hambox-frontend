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
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';

import { ApiError } from '../../../../core/models/api-error.model';
import { CategoryCreateFormComponent } from '../category-create-form/category-create-form.component';
import { CollectionCreateFormComponent } from '../collection-create-form/collection-create-form.component';
import { CategoryOption, CreateCategoryRequest } from '../../models/category.model';
import { CollectionOption, CreateCollectionRequest } from '../../models/collection.model';
import { CreateProductRequest, ProductDraftFormSnapshot } from '../../models/product.model';
import { CategoryApiService, createCategoryWithHierarchy } from '../../services/category-api.service';
import { CollectionApiService } from '../../services/collection-api.service';

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
    FormsModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    MultiSelectModule,
    ButtonModule,
    DialogModule,
    CategoryCreateFormComponent,
    CollectionCreateFormComponent,
  ],
  templateUrl: './product-basic-info-form.component.html',
  styleUrl: './product-basic-info-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductBasicInfoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly collectionApi = inject(CollectionApiService);

  readonly categories = input<readonly CategoryOption[]>([]);
  readonly categoriesLoading = input(false);
  readonly categoriesError = input<string | null>(null);
  readonly collections = input<readonly CollectionOption[]>([]);
  readonly collectionsLoading = input(false);
  readonly disabled = input(false);
  readonly initialSnapshot = input<ProductDraftFormSnapshot | null>(null);
  readonly section = input<'general' | 'pricing' | 'full'>('full');

  /** Emitted after a category is created inline, so the parent facade can refresh its category list. */
  readonly categoryCreated = output<void>();
  /** Emitted after a collection is created inline, so the parent facade can refresh its collection list. */
  readonly collectionCreated = output<void>();

  private readonly newlyCreatedCategoryState = signal<CategoryOption | null>(null);
  private readonly categoryDialogOpenState = signal(false);
  private readonly categoryCreatingState = signal(false);
  private readonly categoryCreateErrorState = signal<string | null>(null);
  private readonly categoryFormResetTokenState = signal(0);

  protected readonly categoryDialogOpen = this.categoryDialogOpenState.asReadonly();
  protected readonly categoryCreating = this.categoryCreatingState.asReadonly();
  protected readonly categoryCreateError = this.categoryCreateErrorState.asReadonly();
  protected readonly categoryFormResetToken = this.categoryFormResetTokenState.asReadonly();

  private readonly newlyCreatedCollectionState = signal<CollectionOption | null>(null);
  private readonly collectionDialogOpenState = signal(false);
  private readonly collectionCreatingState = signal(false);
  private readonly collectionCreateErrorState = signal<string | null>(null);
  private readonly collectionFormResetTokenState = signal(0);

  protected readonly collectionDialogOpen = this.collectionDialogOpenState.asReadonly();
  protected readonly collectionCreating = this.collectionCreatingState.asReadonly();
  protected readonly collectionCreateError = this.collectionCreateErrorState.asReadonly();
  protected readonly collectionFormResetToken = this.collectionFormResetTokenState.asReadonly();

  /** categories() plus an optimistic entry for a just-created category, selectable before the parent's refetch lands. */
  protected readonly categoryOptions = computed(() => {
    const base = this.categories();
    const created = this.newlyCreatedCategoryState();

    if (!created || base.some((option) => option.id === created.id)) {
      return base;
    }

    return [...base, created];
  });

  private readonly selectedCategoryIdState = signal('');
  private readonly additionalCategoryIdsState = signal<readonly string[]>([]);

  /** All currently-selected category ids (primary first), for the multi-select's checkbox state. */
  protected readonly allSelectedCategoryIds = computed(() => {
    const primary = this.selectedCategoryIdState();
    const additional = this.additionalCategoryIdsState();
    return primary ? [primary, ...additional] : [...additional];
  });

  /** Selected categories rendered as chips — the primary one is starred, the rest are plain. */
  protected readonly selectedCategoryChips = computed(() => {
    const primary = this.selectedCategoryIdState();
    const additional = this.additionalCategoryIdsState();
    const labelById = new Map(this.categoryOptions().map((option) => [option.id, option.label]));
    const chips: { id: string; label: string; isPrimary: boolean }[] = [];

    if (primary) {
      chips.push({ id: primary, label: labelById.get(primary) ?? 'Unknown category', isPrimary: true });
    }

    for (const id of additional) {
      chips.push({ id, label: labelById.get(id) ?? 'Unknown category', isPrimary: false });
    }

    return chips;
  });

  /** collections() plus an optimistic entry for a just-created collection, selectable before the parent's refetch lands. */
  protected readonly collectionOptionsMerged = computed(() => {
    const base = this.collections();
    const created = this.newlyCreatedCollectionState();

    if (!created || base.some((option) => option.id === created.id)) {
      return base;
    }

    return [...base, created];
  });

  private readonly selectedCollectionIdsState = signal<readonly string[]>([]);

  /** Selected collections rendered as chips — flat tags, no primary concept unlike categories. */
  protected readonly selectedCollectionChips = computed(() => {
    const labelById = new Map(this.collectionOptionsMerged().map((option) => [option.id, option.label]));
    return this.selectedCollectionIdsState().map((id) => ({ id, label: labelById.get(id) ?? 'Unknown collection' }));
  });

  protected readonly form = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required, Validators.maxLength(200)]],
    nameAr: ['', [Validators.maxLength(200)]],
    descriptionEn: ['', [Validators.maxLength(2000)]],
    descriptionAr: ['', [Validators.maxLength(2000)]],
    price: [0, [Validators.required, Validators.min(0)]],
    categoryId: ['', [Validators.required]],
    additionalCategoryIds: this.fb.nonNullable.control<readonly string[]>([]),
    collectionIds: this.fb.nonNullable.control<readonly string[]>([]),
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
        this.selectedCategoryIdState.set(snapshot.categoryId);
        this.additionalCategoryIdsState.set(snapshot.additionalCategoryIds);
        this.selectedCollectionIdsState.set(snapshot.collectionIds);
        const hasArabic = !!(snapshot.nameAr?.trim() || snapshot.descriptionAr?.trim());
        this.arabicHasValueState.set(hasArabic);
      }
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.dirtyState.set(true);
      this.arabicHasValueState.set(!!(value.nameAr?.trim() || value.descriptionAr?.trim()));
      this.selectedCategoryIdState.set(value.categoryId ?? '');
      this.additionalCategoryIdsState.set(value.additionalCategoryIds ?? []);
      this.selectedCollectionIdsState.set(value.collectionIds ?? []);
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
      additionalCategoryIds: value.additionalCategoryIds,
      collectionIds: value.collectionIds,
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
      additionalCategoryIds: value.additionalCategoryIds,
      collectionIds: value.collectionIds,
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
      additionalCategoryIds: value.additionalCategoryIds,
      collectionIds: value.collectionIds,
      publicReleaseOnUtc: null,
    };
  }

  applyDraftSnapshot(snapshot: ProductDraftFormSnapshot): void {
    this.form.patchValue(snapshot, { emitEvent: false });
    this.form.markAsPristine();
    this.dirtyState.set(false);
    this.selectedCategoryIdState.set(snapshot.categoryId);
    this.additionalCategoryIdsState.set(snapshot.additionalCategoryIds);
    this.selectedCollectionIdsState.set(snapshot.collectionIds);
    const hasArabic = !!(snapshot.nameAr?.trim() || snapshot.descriptionAr?.trim());
    this.arabicHasValueState.set(hasArabic);
  }

  /** Fired by the Collections multi-select whenever the checked set changes — flat tags, no primary concept. */
  protected onCollectionSelectionChange(selectedIds: string[]): void {
    this.form.controls.collectionIds.setValue(selectedIds);
  }

  /** Removes a chip entirely. */
  protected removeCollectionChip(collectionId: string): void {
    this.form.controls.collectionIds.setValue(
      this.form.controls.collectionIds.value.filter((id) => id !== collectionId),
    );
  }

  /** Fired by the merged Category multi-select whenever the checked set changes. */
  protected onCategorySelectionChange(selectedIds: string[]): void {
    const currentPrimary = this.form.controls.categoryId.value;
    const primary = currentPrimary && selectedIds.includes(currentPrimary) ? currentPrimary : (selectedIds[0] ?? '');
    const additional = selectedIds.filter((id) => id !== primary);

    this.form.controls.categoryId.setValue(primary);
    this.form.controls.categoryId.markAsTouched();
    this.form.controls.additionalCategoryIds.setValue(additional);
  }

  /** Stars a chip as the Primary Category; the previous primary (if any) drops back to additional. */
  protected setPrimaryCategory(categoryId: string): void {
    const currentPrimary = this.form.controls.categoryId.value;
    if (currentPrimary === categoryId) {
      return;
    }

    const currentAdditional = this.form.controls.additionalCategoryIds.value;
    const nextAdditional = [currentPrimary, ...currentAdditional].filter(
      (id): id is string => !!id && id !== categoryId,
    );

    this.form.controls.categoryId.setValue(categoryId);
    this.form.controls.additionalCategoryIds.setValue(nextAdditional);
  }

  /** Removes a chip entirely; if it was the primary, the next remaining category is promoted. */
  protected removeCategoryChip(categoryId: string): void {
    const currentPrimary = this.form.controls.categoryId.value;
    const currentAdditional = this.form.controls.additionalCategoryIds.value;

    if (categoryId === currentPrimary) {
      const [nextPrimary, ...rest] = currentAdditional;
      this.form.controls.categoryId.setValue(nextPrimary ?? '');
      this.form.controls.additionalCategoryIds.setValue(rest);
    } else {
      this.form.controls.additionalCategoryIds.setValue(currentAdditional.filter((id) => id !== categoryId));
    }

    this.form.controls.categoryId.markAsTouched();
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
      this.newlyCreatedCategoryState.set({ id, label: request.nameEn, parentId: request.parentId ?? null });

      const currentPrimary = this.form.controls.categoryId.value;
      if (!currentPrimary) {
        this.form.controls.categoryId.setValue(id);
      } else {
        this.form.controls.additionalCategoryIds.setValue([...this.form.controls.additionalCategoryIds.value, id]);
      }
      this.form.controls.categoryId.markAsTouched();

      this.categoryDialogOpenState.set(false);
      this.categoryCreated.emit();
    } catch (error) {
      this.categoryCreateErrorState.set(this.toErrorMessage(error, 'Failed to create category.'));
    } finally {
      this.categoryCreatingState.set(false);
    }
  }

  protected openCollectionDialog(): void {
    this.collectionCreateErrorState.set(null);
    this.collectionFormResetTokenState.update((value) => value + 1);
    this.collectionDialogOpenState.set(true);
  }

  protected closeCollectionDialog(): void {
    this.collectionDialogOpenState.set(false);
    this.collectionCreateErrorState.set(null);
  }

  protected onCollectionDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closeCollectionDialog();
    }
  }

  protected async onCollectionSubmitted(request: CreateCollectionRequest): Promise<void> {
    this.collectionCreatingState.set(true);
    this.collectionCreateErrorState.set(null);

    try {
      const id = await firstValueFrom(this.collectionApi.createCollection(request));
      this.newlyCreatedCollectionState.set({ id, label: request.name, parentId: request.parentId ?? null });
      this.form.controls.collectionIds.setValue([...this.form.controls.collectionIds.value, id]);
      this.collectionDialogOpenState.set(false);
      this.collectionCreated.emit();
    } catch (error) {
      this.collectionCreateErrorState.set(this.toErrorMessage(error, 'Failed to create collection.'));
    } finally {
      this.collectionCreatingState.set(false);
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
