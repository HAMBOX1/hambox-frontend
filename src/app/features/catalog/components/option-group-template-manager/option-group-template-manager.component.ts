import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import {
  AdminConfirmDialogComponent,
  AdminEmptyStateComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminSearchBarComponent,
} from '../../../../shared/components/admin';
import { OptionGroupTemplateOptionInput, OptionGroupTemplateSummaryDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import { slugify } from '../../utils/product-display.utils';

interface EditRow {
  readonly tempId: string;
  label: string;
  readonly descriptionHtml: string | null;
}

/**
 * "Manage saved groups" dialog — lists reusable Option Group Templates, and lets an admin rename
 * a template, edit its value list, or delete it. This is a separate concept from a product's own
 * option groups (see `ProductOptionGroupsPanelComponent`): editing here never touches any product
 * that already imported the template, since import is a one-time snapshot copy.
 *
 * The edit form intentionally exposes only Name + value Labels — per-value descriptions are
 * carried through unchanged (not editable here) rather than duplicating the rich-text instructions
 * editor in a second place; edit those from the product editor after importing.
 */
@Component({
  selector: 'app-option-group-template-manager',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    AdminConfirmDialogComponent,
    AdminEmptyStateComponent,
    AdminIconButtonComponent,
    AdminLoadingSkeletonComponent,
    AdminSearchBarComponent,
  ],
  templateUrl: './option-group-template-manager.component.html',
  styleUrl: './option-group-template-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OptionGroupTemplateManagerComponent {
  private readonly facade = inject(ProductEditorFacade);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  protected readonly loading = signal(false);
  protected readonly templates = signal<readonly OptionGroupTemplateSummaryDto[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly editingTemplateId = signal<string | null>(null);
  protected readonly editName = signal('');
  protected readonly editRows = signal<readonly EditRow[]>([]);
  protected readonly newRowLabel = signal('');
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<OptionGroupTemplateSummaryDto | null>(null);
  protected readonly deleting = signal(false);

  private nextTempId = 0;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.editingTemplateId.set(null);
        this.searchTerm.set('');
        void this.load();
      }
    });
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.templates.set(await this.facade.searchOptionGroupTemplates(this.searchTerm()));
    } finally {
      this.loading.set(false);
    }
  }

  protected onSearchChange(term: string): void {
    this.searchTerm.set(term);
    void this.load();
  }

  protected async startEdit(template: OptionGroupTemplateSummaryDto): Promise<void> {
    this.saveError.set(null);
    const full = await this.facade.getOptionGroupTemplate(template.id);
    if (!full) {
      return;
    }

    this.editingTemplateId.set(full.id);
    this.editName.set(full.name);
    this.editRows.set(
      full.options
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((option) => ({ tempId: `existing-${option.id}`, label: option.label, descriptionHtml: option.descriptionHtml })),
    );
    this.newRowLabel.set('');
  }

  protected cancelEdit(): void {
    this.editingTemplateId.set(null);
    this.saveError.set(null);
  }

  protected addRow(): void {
    const label = this.newRowLabel().trim();
    if (!label) {
      return;
    }

    this.editRows.update((rows) => [...rows, { tempId: `new-${this.nextTempId++}`, label, descriptionHtml: null }]);
    this.newRowLabel.set('');
  }

  protected updateRowLabel(tempId: string, label: string): void {
    this.editRows.update((rows) => rows.map((row) => (row.tempId === tempId ? { ...row, label } : row)));
  }

  protected removeRow(tempId: string): void {
    this.editRows.update((rows) => rows.filter((row) => row.tempId !== tempId));
  }

  protected async saveEdit(): Promise<void> {
    const templateId = this.editingTemplateId();
    const name = this.editName().trim();
    if (!templateId || !name || this.editRows().length === 0) {
      this.saveError.set('Give the group a name and at least one value.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const options: OptionGroupTemplateOptionInput[] = this.editRows().map((row, index) => ({
      value: slugify(row.label),
      label: row.label,
      sortOrder: index,
      descriptionHtml: row.descriptionHtml,
    }));

    try {
      const success = await this.facade.updateOptionGroupTemplate(templateId, {
        name,
        isRequiredDefault: true,
        options,
      });

      if (success) {
        this.editingTemplateId.set(null);
        await this.load();
      } else {
        // Surfaces the backend's actual reason (e.g. a name clash with another saved group) —
        // the form stays open with Name still editable so the admin can just fix it and retry.
        // Deliberately templateActionError, not facade.error() — the latter is treated as a
        // fatal page-load failure by product-edit-page and would blow away the whole editor.
        this.saveError.set(this.facade.templateActionError() ?? 'Unable to save changes.');
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected requestDelete(template: OptionGroupTemplateSummaryDto): void {
    this.deleteTarget.set(template);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) {
      return;
    }

    this.deleting.set(true);
    try {
      const success = await this.facade.deleteOptionGroupTemplate(target.id);
      if (success) {
        this.deleteDialogOpen.set(false);
        this.deleteTarget.set(null);
        await this.load();
      }
    } finally {
      this.deleting.set(false);
    }
  }
}
