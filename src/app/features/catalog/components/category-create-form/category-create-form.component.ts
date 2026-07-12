import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { Category, CategoryOption, CreateCategoryRequest, UpdateCategoryRequest } from '../../models/category.model';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const FIELD_LABELS = {
  nameEn: 'English name',
  nameAr: 'Arabic name',
  slug: 'Slug',
} as const;

@Component({
  selector: 'app-category-create-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, ButtonModule, SelectModule, CheckboxModule],
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

  readonly submitted = output<CreateCategoryRequest>();
  readonly updateSubmitted = output<UpdateCategoryRequest>();
  readonly cancelled = output<void>();

  protected readonly form = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required, Validators.maxLength(200)]],
    nameAr: ['', [Validators.required, Validators.maxLength(200)]],
    slug: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(SLUG_PATTERN)]],
    parentId: this.fb.control<string | null>(null),
    isActive: [true],
  });

  constructor() {
    effect(() => {
      this.resetToken();
      const category = this.initialCategory();

      if (this.mode() === 'edit' && category) {
        this.form.reset({
          nameEn: category.nameEn,
          nameAr: category.nameAr,
          slug: category.slug,
          parentId: category.parentId,
          isActive: category.isActive,
        });
      } else {
        this.form.reset({
          nameEn: '',
          nameAr: '',
          slug: '',
          parentId: null,
          isActive: true,
        });
      }

      this.form.markAsPristine();
      this.form.markAsUntouched();
    });
  }

  protected parentDropdownOptions(): { label: string; value: string | null }[] {
    const editingId = this.initialCategory()?.id ?? null;
    return [
      { label: 'None (top-level)', value: null },
      ...this.parentOptions()
        .filter((option) => option.id !== editingId)
        .map((option) => ({ label: option.label, value: option.id })),
    ];
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

    const generated = this.toSlug(this.form.controls.nameEn.value);
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

    this.submitted.emit({
      nameEn: value.nameEn,
      nameAr: value.nameAr,
      slug: value.slug,
      parentId: value.parentId,
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  private toSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
