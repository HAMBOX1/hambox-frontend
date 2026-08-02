import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { AdminErrorAlertComponent, AdminSectionCardComponent } from '../../../../shared/components/admin';
import { Category, CategoryOption, CreateCategoryRequest, UpdateCategoryRequest } from '../../models/category.model';
import { CategoryApiService } from '../../services/category-api.service';
import { slugify } from '../../utils/product-display.utils';
import {
  isAllowedProductImage,
  PRODUCT_IMAGE_MAX_BYTES,
  resolveProductImageUrl,
} from '../../utils/product-image.utils';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NEW_PARENT_OPTION_VALUE = '__new_parent__';

const FIELD_LABELS = {
  nameEn: 'English name',
  slug: 'Slug',
} as const;

@Component({
  selector: 'app-category-create-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    SelectModule,
    CheckboxModule,
    TooltipModule,
    AdminErrorAlertComponent,
    AdminSectionCardComponent,
  ],
  templateUrl: './category-create-form.component.html',
  styleUrl: './category-create-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryCreateFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoryApi = inject(CategoryApiService);

  private readonly imageInput = viewChild<ElementRef<HTMLInputElement>>('categoryImageInput');

  readonly mode = input<'create' | 'edit'>('create');
  readonly submitting = input(false);
  readonly serverError = input<string | null>(null);
  readonly resetToken = input(0);
  readonly parentOptions = input<readonly CategoryOption[]>([]);
  readonly initialCategory = input<Category | null>(null);
  readonly initialParentId = input<string | null>(null);
  /** Pre-fills `nameEn`/`slug` in create mode only (e.g. from an import-wizard correction) — ignored once `initialCategory` supplies a value via edit mode. */
  readonly initialNameEn = input<string>('');

  readonly submitted = output<CreateCategoryRequest>();
  readonly updateSubmitted = output<UpdateCategoryRequest>();
  readonly deleteRequested = output<void>();
  readonly cancelled = output<void>();
  /** Emitted after the image is uploaded/removed directly against the backend (independent
   * of the Save button) — lets the host refresh anything else showing this category's thumbnail. */
  readonly imageChanged = output<void>();

  protected readonly imagePreviewUrl = signal<string | null>(null);
  protected readonly uploadingImage = signal(false);
  protected readonly imageError = signal<string | null>(null);

  protected readonly showArabic = signal(false);
  protected readonly advancedCollapsed = signal(true);

  private readonly arabicHasValueState = signal(false);
  protected readonly arabicHasValue = this.arabicHasValueState.asReadonly();

  private readonly dirtyState = signal(false);
  /** True once the owner has actually edited a field (never flips on the programmatic
   * reset used to load/open the form). Lets the host (dialog/drawer) intercept a close
   * attempt and confirm before discarding. */
  readonly isDirty = this.dirtyState.asReadonly();

  /** Guards the populate-on-open effect below against re-running mid-session. Angular
   * re-invokes a component's effects on every view refresh that touches this component
   * (e.g. the CD pass triggered by the user picking a value in the parent-category
   * p-select), not only when a tracked signal's value actually changes — so without
   * this guard, `resetToken`/`initialCategory` reading the *same* values on a spurious
   * extra run still re-executes `form.reset(...)`, silently discarding whatever the
   * owner just picked (most visibly: selecting "No parent" always snapped back to the
   * category's original parent). NaN as the sentinel guarantees the first real run
   * (resetToken starts at a number) always populates the form. */
  private appliedResetToken = Number.NaN;

  protected readonly form = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required, Validators.maxLength(200)]],
    nameAr: ['', [Validators.maxLength(200)]],
    slug: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(SLUG_PATTERN)]],
    categoryType: this.fb.nonNullable.control<'root' | 'child'>('root'),
    parentId: this.fb.control<string | null>(null),
    isActive: [true],
    newParent: this.fb.nonNullable.group({
      nameEn: ['', [Validators.required, Validators.maxLength(200)]],
      nameAr: ['', [Validators.maxLength(200)]],
      slug: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(SLUG_PATTERN)]],
    }),
    subcategories: this.fb.array<ReturnType<typeof this.createSubcategoryGroup>>([]),
  });

  constructor() {
    effect(() => {
      const token = this.resetToken();
      const category = this.initialCategory();
      const mode = this.mode();

      if (token === this.appliedResetToken) {
        return;
      }
      this.appliedResetToken = token;

      const editing = mode === 'edit' && category;
      const parentId = editing ? category.parentId : this.initialParentId();

      const prefillNameEn = editing ? '' : this.initialNameEn();

      this.form.reset(
        {
          nameEn: editing ? category.nameEn : prefillNameEn,
          nameAr: editing ? category.nameAr : '',
          slug: editing ? category.slug : (prefillNameEn ? slugify(prefillNameEn) : ''),
          categoryType: parentId ? 'child' : 'root',
          parentId,
          isActive: editing ? category.isActive : true,
          newParent: { nameEn: '', nameAr: '', slug: '' },
        },
        { emitEvent: false },
      );
      this.form.controls.newParent.disable({ emitEvent: false });
      this.subcategories.clear({ emitEvent: false });
      this.updateParentValidity();

      this.imagePreviewUrl.set(editing ? resolveProductImageUrl(category.imageUrl ?? '') || null : null);
      this.imageError.set(null);

      const hasArabic = !!editing && category.nameAr.trim().length > 0 && category.nameAr !== category.nameEn;
      this.showArabic.set(hasArabic);
      this.arabicHasValueState.set(hasArabic);
      this.advancedCollapsed.set(true);

      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.dirtyState.set(false);
    });

    this.form.controls.nameAr.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.arabicHasValueState.set(!!value.trim());
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.dirtyState.set(true);
    });
  }

  protected revealArabic(): void {
    this.showArabic.set(true);
  }

  protected hideArabic(): void {
    this.showArabic.set(false);
  }

  protected openImagePicker(): void {
    this.imageInput()?.nativeElement.click();
  }

  protected async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    const categoryId = this.initialCategory()?.id;
    if (!file || !categoryId) {
      return;
    }

    if (!isAllowedProductImage(file)) {
      this.imageError.set('Only JPG, PNG, WEBP, and GIF images are allowed.');
      return;
    }

    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      this.imageError.set('Image must be 5 MB or smaller.');
      return;
    }

    this.imageError.set(null);
    this.uploadingImage.set(true);

    try {
      const { imageUrl } = await firstValueFrom(this.categoryApi.uploadCategoryImage(categoryId, file));
      this.imagePreviewUrl.set(resolveProductImageUrl(imageUrl));
      this.imageChanged.emit();
    } catch {
      this.imageError.set('Unable to upload image.');
    } finally {
      this.uploadingImage.set(false);
    }
  }

  protected async removeImage(): Promise<void> {
    const categoryId = this.initialCategory()?.id;
    if (!categoryId) {
      return;
    }

    this.imageError.set(null);
    this.uploadingImage.set(true);

    try {
      await firstValueFrom(this.categoryApi.removeCategoryImage(categoryId));
      this.imagePreviewUrl.set(null);
      this.imageChanged.emit();
    } catch {
      this.imageError.set('Unable to remove image.');
    } finally {
      this.uploadingImage.set(false);
    }
  }

  protected isChildCategory(): boolean {
    return this.form.controls.categoryType.value === 'child';
  }

  protected onCategoryTypeChange(): void {
    if (!this.isChildCategory()) {
      this.form.controls.parentId.setValue(null);
      this.form.controls.newParent.disable({ emitEvent: false });
      this.form.controls.newParent.reset({ nameEn: '', nameAr: '', slug: '' }, { emitEvent: false });
    }
    this.updateParentValidity();
  }

  protected get subcategories(): FormArray<ReturnType<typeof this.createSubcategoryGroup>> {
    return this.form.controls.subcategories;
  }

  protected addSubcategory(): void {
    this.subcategories.push(this.createSubcategoryGroup());
  }

  protected removeSubcategory(index: number): void {
    this.subcategories.removeAt(index);
  }

  protected onSubcategoryNameEnBlur(index: number): void {
    const group = this.subcategories.at(index);
    const slugControl = group.controls.slug;

    if (slugControl.value.trim() || slugControl.dirty) {
      return;
    }

    const generated = slugify(group.controls.nameEn.value);
    if (generated) {
      slugControl.setValue(generated);
    }
  }

  protected subcategoryFieldError(index: number, controlName: 'nameEn' | 'slug'): string | null {
    const control = this.subcategories.at(index).controls[controlName];

    if (!control.touched || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return controlName === 'nameEn' ? 'Subcategory name is required.' : 'Subcategory slug is required.';
    }

    if (control.errors['maxlength']) {
      return 'Must be 200 characters or fewer.';
    }

    if (control.errors['pattern']) {
      return 'Slug must use lowercase letters, numbers, and hyphens only.';
    }

    return 'Invalid value.';
  }

  private createSubcategoryGroup() {
    return this.fb.nonNullable.group({
      nameEn: ['', [Validators.required, Validators.maxLength(200)]],
      nameAr: ['', [Validators.maxLength(200)]],
      slug: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(SLUG_PATTERN)]],
    });
  }

  /** Parent is required only when creating via the "Child Category" radio — in edit
   * mode "No parent" is always a legal target (moving a category back to root), so
   * requiring it there would permanently lock out that move for the rest of the
   * session (the radio that drove the old requirement doesn't exist in edit mode). */
  private updateParentValidity(): void {
    const requireParent = this.mode() === 'create' && this.isChildCategory();
    this.form.controls.parentId.setValidators(requireParent ? [Validators.required] : []);
    this.form.controls.parentId.updateValueAndValidity({ emitEvent: false });
  }

  /** A `computed()`, not a plain method: it must return a referentially stable array
   * across change-detection cycles that don't actually change its inputs. PrimeNG's
   * p-select re-renders its option list whenever the `[options]` array reference
   * changes, and Angular's default `@for` (object identity, no `track` key on these
   * POJOs) tears down and rebuilds the option `<li>` elements when that happens. A
   * plain method called from the template (`parentDropdownOptions()`) returns a brand
   * new array on *every* tick — including the tick that happens mid-click/mid-keypress
   * while the dropdown is open — so the option the user is clicking/pressing Enter on
   * can already be a detached, dead DOM node by the time the event fires. Net effect:
   * selecting an option (most visibly "No parent (root category)") silently no-ops
   * and the field snaps back to its previous value. Memoizing this closes that gap. */
  protected readonly parentDropdownOptions = computed<{ label: string; value: string | null }[]>(() => {
    const editingId = this.initialCategory()?.id ?? null;
    const options = this.parentOptions()
      .filter((option) => option.id !== editingId)
      .map((option) => ({ label: option.label, value: option.id as string | null }));

    if (this.mode() === 'edit') {
      return [{ label: 'No parent (root category)', value: null }, ...options];
    }

    return [{ label: '+ Create new parent category', value: NEW_PARENT_OPTION_VALUE }, ...options];
  });

  protected parentFieldError(): string | null {
    const control = this.form.controls.parentId;
    if (!control.touched || !control.errors) {
      return null;
    }
    return control.errors['required'] ? 'Select or create a parent category.' : 'Invalid value.';
  }

  protected isCreatingNewParent(): boolean {
    return this.form.controls.parentId.value === NEW_PARENT_OPTION_VALUE;
  }

  protected onParentChange(): void {
    if (this.isCreatingNewParent()) {
      this.form.controls.newParent.enable({ emitEvent: false });
    } else {
      this.form.controls.newParent.disable({ emitEvent: false });
      this.form.controls.newParent.reset({ nameEn: '', nameAr: '', slug: '' }, { emitEvent: false });
    }
  }

  protected newParentFieldError(controlName: 'nameEn' | 'slug'): string | null {
    const control = this.form.controls.newParent.controls[controlName];

    if (!control.touched || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return controlName === 'nameEn' ? 'New parent name is required.' : 'New parent slug is required.';
    }

    if (control.errors['maxlength']) {
      return 'Must be 200 characters or fewer.';
    }

    if (control.errors['pattern']) {
      return 'Slug must use lowercase letters, numbers, and hyphens only.';
    }

    return 'Invalid value.';
  }

  protected onNewParentNameEnBlur(): void {
    const slugControl = this.form.controls.newParent.controls.slug;

    if (slugControl.value.trim() || slugControl.dirty) {
      return;
    }

    const generated = slugify(this.form.controls.newParent.controls.nameEn.value);
    if (generated) {
      slugControl.setValue(generated);
    }
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
      return `${FIELD_LABELS[controlName]} must be 200 characters or fewer.`;
    }

    if (control.errors['pattern']) {
      return 'Slug must use lowercase letters, numbers, and hyphens only.';
    }

    return 'Invalid value.';
  }

  protected onNameEnBlur(): void {
    const slugControl = this.form.controls.slug;

    if (slugControl.value.trim() || slugControl.dirty || this.mode() === 'edit') {
      return;
    }

    const generated = slugify(this.form.controls.nameEn.value);
    if (generated) {
      slugControl.setValue(generated);
    }
  }

  protected submitLabel(): string {
    return this.mode() === 'edit' ? 'Save Changes' : 'Create Category';
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    const value = this.form.getRawValue();

    if (this.mode() === 'edit') {
      this.updateSubmitted.emit({
        nameEn: value.nameEn,
        nameAr: value.nameAr,
        slug: value.slug,
        isActive: value.isActive,
        parentId: value.parentId,
      });
      return;
    }

    const creatingNewParent = value.parentId === NEW_PARENT_OPTION_VALUE;
    const newParent = creatingNewParent ? value.newParent : null;
    const parentId = creatingNewParent ? null : value.parentId;

    this.submitted.emit({
      nameEn: value.nameEn,
      nameAr: value.nameAr || value.nameEn,
      slug: value.slug,
      parentId,
      newParent,
      // For a root category these become its children; for a child category
      // there's no "root" to nest under, so createCategoryWithHierarchy parents
      // them as siblings under the same parentId instead — see there.
      subcategories: value.subcategories,
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected requestDelete(): void {
    this.deleteRequested.emit();
  }
}
