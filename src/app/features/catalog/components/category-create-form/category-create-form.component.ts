import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { AdminErrorAlertComponent, AdminSectionCardComponent } from '../../../../shared/components/admin';
import { Category, CategoryOption, CreateCategoryRequest, UpdateCategoryRequest } from '../../models/category.model';
import { slugify } from '../../utils/product-display.utils';

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

  readonly mode = input<'create' | 'edit'>('create');
  readonly submitting = input(false);
  readonly serverError = input<string | null>(null);
  readonly resetToken = input(0);
  readonly parentOptions = input<readonly CategoryOption[]>([]);
  readonly initialCategory = input<Category | null>(null);
  readonly initialParentId = input<string | null>(null);

  readonly submitted = output<CreateCategoryRequest>();
  readonly updateSubmitted = output<UpdateCategoryRequest>();
  readonly deleteRequested = output<void>();
  readonly cancelled = output<void>();

  protected readonly showArabic = signal(false);
  protected readonly advancedCollapsed = signal(true);

  private readonly arabicHasValueState = signal(false);
  protected readonly arabicHasValue = this.arabicHasValueState.asReadonly();

  private readonly dirtyState = signal(false);
  /** True once the owner has actually edited a field (never flips on the programmatic
   * reset used to load/open the form). Lets the host (dialog/drawer) intercept a close
   * attempt and confirm before discarding. */
  readonly isDirty = this.dirtyState.asReadonly();

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
      this.resetToken();
      const category = this.initialCategory();
      const editing = this.mode() === 'edit' && category;
      const parentId = editing ? category.parentId : this.initialParentId();

      this.form.reset(
        {
          nameEn: editing ? category.nameEn : '',
          nameAr: editing ? category.nameAr : '',
          slug: editing ? category.slug : '',
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

  protected isChildCategory(): boolean {
    return this.form.controls.categoryType.value === 'child';
  }

  protected onCategoryTypeChange(): void {
    if (!this.isChildCategory()) {
      this.form.controls.parentId.setValue(null);
      this.form.controls.newParent.disable({ emitEvent: false });
      this.form.controls.newParent.reset({ nameEn: '', nameAr: '', slug: '' }, { emitEvent: false });
    } else {
      this.subcategories.clear();
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

  private updateParentValidity(): void {
    this.form.controls.parentId.setValidators(this.isChildCategory() ? [Validators.required] : []);
    this.form.controls.parentId.updateValueAndValidity({ emitEvent: false });
  }

  protected parentDropdownOptions(): { label: string; value: string | null }[] {
    const editingId = this.initialCategory()?.id ?? null;
    const options = this.parentOptions()
      .filter((option) => option.id !== editingId)
      .map((option) => ({ label: option.label, value: option.id as string | null }));

    if (this.mode() === 'edit') {
      return [{ label: 'No parent (root category)', value: null }, ...options];
    }

    return [{ label: '+ Create new parent category', value: NEW_PARENT_OPTION_VALUE }, ...options];
  }

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
      subcategories: value.categoryType === 'root' ? value.subcategories : null,
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected requestDelete(): void {
    this.deleteRequested.emit();
  }
}
