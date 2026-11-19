import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { firstValueFrom } from 'rxjs';

import { buildBasicEditorModules } from '../../../../core/editor/quill-config';
import { ApiError } from '../../../../core/models/api-error.model';
import { ProductVariantDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import { ProductInstructionsApiService } from '../../services/product-instructions-api.service';
import { ProductInstructionsPanelComponent } from '../product-instructions-panel/product-instructions-panel.component';

/**
 * The "Instructions" dialog of one variant. It holds two different things, kept apart and labelled so it is clear which
 * does what:
 *  1. the note shoppers see on the PRODUCT PAGE while this exact variant is selected (works like an option's instructions);
 *  2. the private guide only customers who BOUGHT it can open in their library (autosave + Publish, the product-level
 *     editor reused as-is, scoped to this variant).
 */
@Component({
  selector: 'app-variant-instructions-dialog',
  standalone: true,
  imports: [FormsModule, ButtonModule, CheckboxModule, DialogModule, EditorModule, ProductInstructionsPanelComponent],
  templateUrl: './variant-instructions-dialog.component.html',
  styles: `
    .vi__section {
      display: grid;
      gap: 0.6rem;
    }

    .vi__section + .vi__section {
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--color-panel-border, rgba(128, 128, 128, 0.3));
    }

    .vi__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }

    .vi__hint {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }

    .vi__check {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .vi__actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .vi__saved {
      font-size: 0.8125rem;
      color: var(--admin-accent-green, #34d399);
    }

    .vi__error {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--admin-accent-red, #f87171);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantInstructionsDialogComponent {
  private readonly facade = inject(ProductEditorFacade);
  private readonly instructionsApi = inject(ProductInstructionsApiService);

  readonly visible = input(false);
  readonly productId = input.required<string>();
  readonly variant = input<ProductVariantDto | null>(null);

  readonly visibleChange = output<boolean>();

  protected readonly header = computed(() => {
    const sku = this.variant()?.sku;
    return sku ? `Instructions — ${sku}` : 'Instructions';
  });

  protected readonly pageNote = signal('');
  protected readonly pageNoteInline = signal(false);
  protected readonly savedNote = signal('');
  protected readonly savedInline = signal(false);
  protected readonly saving = signal(false);
  protected readonly justSaved = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly dirty = computed(() => this.pageNote() !== this.savedNote() || this.pageNoteInline() !== this.savedInline());

  protected readonly editorModules = buildBasicEditorModules(async (file) => {
    this.error.set(null);
    try {
      return (await firstValueFrom(this.instructionsApi.uploadImage(this.productId(), file))).url;
    } catch (error) {
      this.error.set(error instanceof ApiError && error.message ? error.message : 'Could not upload the picture. Use a JPG, PNG or WebP image.');
      return null;
    }
  });

  constructor() {
    // Starts from what the variant has saved each time the dialog opens for a variant.
    effect(() => {
      const variant = this.variant();
      const note = variant?.descriptionHtml ?? '';
      const inline = variant?.showDescriptionInline ?? false;
      this.pageNote.set(note);
      this.pageNoteInline.set(inline);
      this.savedNote.set(note);
      this.savedInline.set(inline);
      this.error.set(null);
      this.justSaved.set(false);
    });
  }

  protected onVisibleChange(visible: boolean): void {
    this.visibleChange.emit(visible);
  }

  protected onNoteChange(value: string | null): void {
    this.pageNote.set(value ?? '');
    this.justSaved.set(false);
  }

  protected async savePageNote(): Promise<void> {
    const variant = this.variant();
    if (!variant || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const note = this.pageNote();
    const inline = this.pageNoteInline();
    const hasText = note.replace(/<[^>]*>/g, '').trim().length > 0 || /<img\b/i.test(note);
    const ok = await this.facade.setVariantDescription(variant.id, hasText ? note : null, inline);
    this.saving.set(false);
    if (ok) {
      this.savedNote.set(note);
      this.savedInline.set(inline);
      this.justSaved.set(true);
    } else {
      this.error.set(this.facade.error() ?? 'Could not save. Please try again.');
    }
  }
}
