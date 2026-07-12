import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { CategoryOption } from '../../models/category.model';
import { CreateProductRequest, ProductDraftFormSnapshot } from '../../models/product.model';

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
  imports: [ReactiveFormsModule, InputTextModule, TextareaModule, InputNumberModule, SelectModule],
  templateUrl: './product-basic-info-form.component.html',
  styleUrl: './product-basic-info-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductBasicInfoFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly categories = input<readonly CategoryOption[]>([]);
  readonly categoriesLoading = input(false);
  readonly categoriesError = input<string | null>(null);
  readonly disabled = input(false);
  readonly initialSnapshot = input<ProductDraftFormSnapshot | null>(null);
  readonly section = input<'general' | 'pricing' | 'full'>('full');

  protected readonly form = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required, Validators.maxLength(200)]],
    nameAr: ['', [Validators.required, Validators.maxLength(200)]],
    descriptionEn: ['', [Validators.required, Validators.maxLength(2000)]],
    descriptionAr: ['', [Validators.required, Validators.maxLength(2000)]],
    price: [0, [Validators.required, Validators.min(0)]],
    categoryId: ['', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const snapshot = this.initialSnapshot();
      if (snapshot) {
        this.form.patchValue(snapshot, { emitEvent: false });
        this.form.markAsPristine();
      }
    });
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
}
