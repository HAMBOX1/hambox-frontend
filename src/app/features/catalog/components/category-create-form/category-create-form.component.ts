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
import { InputTextModule } from 'primeng/inputtext';

import { CreateCategoryRequest } from '../../models/category.model';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const FIELD_LABELS = {
  nameEn: 'English name',
  nameAr: 'Arabic name',
  slug: 'Slug',
} as const;

@Component({
  selector: 'app-category-create-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, ButtonModule],
  templateUrl: './category-create-form.component.html',
  styleUrl: './category-create-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryCreateFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly submitting = input(false);
  readonly serverError = input<string | null>(null);
  readonly resetToken = input(0);

  readonly submitted = output<CreateCategoryRequest>();
  readonly cancelled = output<void>();

  protected readonly form = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required, Validators.maxLength(200)]],
    nameAr: ['', [Validators.required, Validators.maxLength(200)]],
    slug: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(SLUG_PATTERN)]],
  });

  constructor() {
    effect(() => {
      this.resetToken();
      this.form.reset({
        nameEn: '',
        nameAr: '',
        slug: '',
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
    });
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

    if (slugControl.value.trim() || slugControl.dirty) {
      return;
    }

    const generated = this.toSlug(this.form.controls.nameEn.value);
    if (generated) {
      slugControl.setValue(generated);
    }
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitted.emit(this.form.getRawValue());
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
