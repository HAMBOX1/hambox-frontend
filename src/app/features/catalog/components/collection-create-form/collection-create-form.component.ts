import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { AdminErrorAlertComponent } from '../../../../shared/components/admin';
import {
  CollectionOption,
  CreateCollectionRequest,
  ProductCollection,
  UpdateCollectionRequest,
} from '../../models/collection.model';
import { COLLECTION_COLOR_PRESETS, COLLECTION_ICON_PRESETS } from '../../utils/collection-presets.util';

const FIELD_LABELS = {
  name: 'Name',
} as const;

/** Simplified sibling of `CategoryCreateFormComponent` — Collections are internal-only tags
 * with no bilingual name/slug/subcategory-nesting flow, just the fields the spec calls for:
 * Name, Description, Parent, Color, Icon. Sort order is set via drag-and-drop reorder only. */
@Component({
  selector: 'app-collection-create-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, TextareaModule, SelectModule, ButtonModule, AdminErrorAlertComponent],
  templateUrl: './collection-create-form.component.html',
  styleUrl: './collection-create-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionCreateFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly mode = input<'create' | 'edit'>('create');
  readonly submitting = input(false);
  readonly serverError = input<string | null>(null);
  readonly resetToken = input(0);
  readonly parentOptions = input<readonly CollectionOption[]>([]);
  readonly initialCollection = input<ProductCollection | null>(null);
  readonly initialParentId = input<string | null>(null);

  readonly submitted = output<CreateCollectionRequest>();
  readonly updateSubmitted = output<UpdateCollectionRequest>();
  readonly cancelled = output<void>();

  protected readonly colorPresets = COLLECTION_COLOR_PRESETS;
  protected readonly iconPresets = COLLECTION_ICON_PRESETS;

  private appliedResetToken = Number.NaN;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(1000)]],
    parentId: this.fb.control<string | null>(null),
    color: this.fb.control<string | null>(null),
    icon: this.fb.control<string | null>(null),
  });

  constructor() {
    effect(() => {
      const token = this.resetToken();
      const collection = this.initialCollection();
      const mode = this.mode();

      if (token === this.appliedResetToken) {
        return;
      }
      this.appliedResetToken = token;

      const editing = mode === 'edit' && collection;

      this.form.reset(
        {
          name: editing ? collection.name : '',
          description: editing ? (collection.description ?? '') : '',
          parentId: editing ? collection.parentId : this.initialParentId(),
          color: editing ? collection.color : null,
          icon: editing ? collection.icon : null,
        },
        { emitEvent: false },
      );

      this.form.markAsPristine();
      this.form.markAsUntouched();
    });
  }

  protected readonly parentDropdownOptions = computed<{ label: string; value: string | null }[]>(() => {
    const editingId = this.initialCollection()?.id ?? null;
    const options = this.parentOptions()
      .filter((option) => option.id !== editingId)
      .map((option) => ({ label: option.label, value: option.id as string | null }));

    return [{ label: 'No parent (top-level)', value: null }, ...options];
  });

  protected selectColor(key: string): void {
    this.form.controls.color.setValue(this.form.controls.color.value === key ? null : key);
  }

  protected selectIcon(icon: string): void {
    this.form.controls.icon.setValue(this.form.controls.icon.value === icon ? null : icon);
  }

  protected isColorSelected(key: string): boolean {
    return this.form.controls.color.value === key;
  }

  protected isIconSelected(icon: string): boolean {
    return this.form.controls.icon.value === icon;
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
      return `${FIELD_LABELS[controlName]} must be ${control.errors['maxlength'].requiredLength} characters or fewer.`;
    }

    return 'Invalid value.';
  }

  protected submitLabel(): string {
    return this.mode() === 'edit' ? 'Save Changes' : 'Create Internal Category';
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    const value = this.form.getRawValue();

    if (this.mode() === 'edit') {
      this.updateSubmitted.emit({
        name: value.name,
        description: value.description || null,
        color: value.color,
        icon: value.icon,
        parentId: value.parentId,
        sortOrder: this.initialCollection()?.sortOrder ?? 0,
      });
      return;
    }

    this.submitted.emit({
      name: value.name,
      description: value.description || null,
      color: value.color,
      icon: value.icon,
      parentId: value.parentId,
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
