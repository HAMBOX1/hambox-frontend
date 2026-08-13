import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { InputTextModule } from 'primeng/inputtext';

import {
  AdminConfirmDialogComponent,
  AdminEmptyStateComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminSearchBarComponent,
} from '../../../../shared/components/admin';
import { OptionDescriptionTemplateDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';

/**
 * "Manage saved descriptions" dialog — lists reusable Option Description Templates, and lets an
 * admin rename one, edit its content, or delete it. Mirrors
 * `OptionGroupTemplateManagerComponent`: editing/deleting here never touches a product option that
 * already copied a template's content, since applying one is a one-time snapshot copy, not a live
 * reference.
 */
@Component({
  selector: 'app-option-description-template-manager',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    EditorModule,
    InputTextModule,
    AdminConfirmDialogComponent,
    AdminEmptyStateComponent,
    AdminIconButtonComponent,
    AdminLoadingSkeletonComponent,
    AdminSearchBarComponent,
  ],
  templateUrl: './option-description-template-manager.component.html',
  styleUrl: './option-description-template-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OptionDescriptionTemplateManagerComponent {
  private readonly facade = inject(ProductEditorFacade);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  protected readonly loading = signal(false);
  protected readonly templates = signal<readonly OptionDescriptionTemplateDto[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly editingTemplateId = signal<string | null>(null);
  protected readonly editName = signal('');
  protected readonly editDescriptionHtml = signal('');
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<OptionDescriptionTemplateDto | null>(null);
  protected readonly deleting = signal(false);

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
      this.templates.set(await this.facade.searchOptionDescriptionTemplates(this.searchTerm()));
    } finally {
      this.loading.set(false);
    }
  }

  protected onSearchChange(term: string): void {
    this.searchTerm.set(term);
    void this.load();
  }

  protected startEdit(template: OptionDescriptionTemplateDto): void {
    this.saveError.set(null);
    this.editingTemplateId.set(template.id);
    this.editName.set(template.name);
    this.editDescriptionHtml.set(template.descriptionHtml);
  }

  protected cancelEdit(): void {
    this.editingTemplateId.set(null);
    this.saveError.set(null);
  }

  protected async saveEdit(): Promise<void> {
    const templateId = this.editingTemplateId();
    const name = this.editName().trim();
    const descriptionHtml = this.editDescriptionHtml().trim();
    if (!templateId || !name || !descriptionHtml) {
      this.saveError.set('Give the description a name and some content.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const success = await this.facade.updateOptionDescriptionTemplate(templateId, { name, descriptionHtml });
      if (success) {
        this.editingTemplateId.set(null);
        await this.load();
      } else {
        // Surfaces the backend's actual reason (e.g. a name clash with another saved description)
        // — the form stays open so the admin can just fix it and retry.
        this.saveError.set(this.facade.templateActionError() ?? 'Unable to save changes.');
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected previewText(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  protected requestDelete(template: OptionDescriptionTemplateDto): void {
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
      const success = await this.facade.deleteOptionDescriptionTemplate(target.id);
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
