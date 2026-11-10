import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { buildProductInstructionsEditorModules } from '../../../../core/editor/quill-config';
import {
  AdminConfirmDialogComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';
import { RichContentViewerComponent } from '../../../../shared/components/rich-content-viewer/rich-content-viewer.component';
import { ProductInstructionsFacade } from '../../services/product-instructions.facade';

import { TranslateService, TranslatePipe } from '@ngx-translate/core';
const AUTOSAVE_DEBOUNCE_MS = 1500;
// Mirrors the backend limits so an over-long value is stopped in the editor instead of failing every autosave.
const MAX_TITLE_LENGTH = 200;

@Component({
  selector: 'app-product-instructions-panel',
  standalone: true,
  imports: [TranslatePipe, 
    FormsModule,
    ButtonModule,
    DialogModule,
    EditorModule,
    InputTextModule,
    ToastModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminStatusBadgeComponent,
    AdminConfirmDialogComponent,
    HamboxDatePipe,
    RichContentViewerComponent,
  ],
  providers: [ProductInstructionsFacade, MessageService],
  templateUrl: './product-instructions-panel.component.html',
  styleUrl: './product-instructions-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductInstructionsPanelComponent {
  private readonly translate = inject(TranslateService);
  private readonly facade = inject(ProductInstructionsFacade);
  private readonly messageService = inject(MessageService);

  readonly productId = input<string | null>(null);
  readonly variantId = input<string | null>(null);

  protected readonly permissions = PERMISSIONS;
  protected readonly instructions = this.facade.instructions;
  protected readonly loading = this.facade.loading;
  protected readonly saving = this.facade.saving;
  protected readonly publishing = this.facade.publishing;
  protected readonly error = this.facade.error;

  protected readonly titleState = signal('');
  protected readonly contentState = signal('');
  protected readonly previewOpen = signal(false);
  protected readonly publishConfirmOpen = signal(false);
  protected readonly unpublishConfirmOpen = signal(false);

  protected readonly editorModules = buildProductInstructionsEditorModules((file) => this.uploadImage(file));

  /** Unsaved relative to the last value the backend actually persisted (autosave target, not a user-facing "dirty since load" concept). */
  protected readonly dirty = computed(() => {
    const saved = this.instructions();
    return this.titleState() !== (saved?.title ?? '') || this.contentState() !== (saved?.contentHtml ?? '');
  });

  protected readonly maxTitleLength = MAX_TITLE_LENGTH;

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  /** True once the admin typed since the last sync, so a server response never overwrites newer keystrokes. */
  private userEdited = false;

  constructor() {
    effect(() => {
      const productId = this.productId();
      const variantId = this.variantId();
      if (!productId) {
        return;
      }
      this.userEdited = false;
      void this.facade.load(productId, variantId);
    });

    effect(() => {
      const saved = this.instructions();
      if (this.userEdited) {
        return;
      }
      this.titleState.set(saved?.title ?? '');
      this.contentState.set(saved?.contentHtml ?? '');
    });
  }

  protected onTitleChange(value: string): void {
    this.userEdited = true;
    this.titleState.set(value);
    this.scheduleAutosave();
  }

  protected onContentChange(value: string): void {
    this.userEdited = true;
    this.contentState.set(value ?? '');
    this.scheduleAutosave();
  }

  protected async onPublish(): Promise<void> {
    const productId = this.productId();
    if (!productId) {
      return;
    }
    this.publishConfirmOpen.set(false);
    await this.flushAutosave();
    const published = await this.facade.publish(productId, this.variantId());
    this.notify(published, this.translate.instant('ADMIN.CATALOG_UI.INSTRUCTIONS_PUBLISHED'), this.translate.instant('ADMIN.CATALOG_UI.INSTRUCTIONS_PUBLISH_FAILED'));
  }

  protected async onUnpublish(): Promise<void> {
    const productId = this.productId();
    if (!productId) {
      return;
    }
    this.unpublishConfirmOpen.set(false);
    const unpublished = await this.facade.unpublish(productId, this.variantId());
    this.notify(unpublished, this.translate.instant('ADMIN.CATALOG_UI.INSTRUCTIONS_UNPUBLISHED'), this.translate.instant('ADMIN.CATALOG_UI.INSTRUCTIONS_UNPUBLISH_FAILED'));
  }

  private scheduleAutosave(): void {
    const productId = this.productId();
    if (!productId || !this.titleState().trim()) {
      // No product yet, or the title is still blank — nothing worth persisting.
      return;
    }

    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }

    this.autosaveTimer = setTimeout(() => {
      void this.persist(productId);
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  /** Publishing should never race a pending debounced autosave — flush it first so Publish always ships the latest edits. */
  private async flushAutosave(): Promise<void> {
    if (!this.dirty()) {
      return;
    }

    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }

    const productId = this.productId();
    if (!productId || !this.titleState().trim()) {
      return;
    }

    await this.persist(productId);
  }

  /** Saves the current editor state; stays "unsaved" and tells the admin when the server refuses it. */
  private async persist(productId: string): Promise<void> {
    const title = this.titleState();
    const content = this.contentState();
    const saved = await this.facade.save(productId, title, content, this.variantId());
    if (!saved) {
      this.notify(false, '', this.translate.instant('ADMIN.CATALOG_UI.INSTRUCTIONS_SAVE_FAILED'));
      return;
    }
    // Only treat the editor as in sync when nothing was typed while the request was in flight.
    if (this.titleState() === title && this.contentState() === content) {
      this.userEdited = false;
    }
  }

  private async uploadImage(file: File): Promise<string | null> {
    const productId = this.productId();
    if (!productId) {
      return null;
    }

    const url = await this.facade.uploadImage(productId, file);
    if (!url) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.IMAGE_UPLOAD_FAILED'),
        detail: this.facade.error() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.IMAGE_UPLOAD_UNABLE'),
        life: 5000,
      });
    }
    return url;
  }

  private notify(success: boolean, successDetail: string, failureFallback: string): void {
    this.messageService.add(
      success
        ? { severity: 'success', summary: this.translate.instant('ADMIN.CATALOG_TOASTS.INSTRUCTIONS'), detail: successDetail, life: 4000 }
        : { severity: 'error', summary: this.translate.instant('ADMIN.CATALOG_TOASTS.INSTRUCTIONS'), detail: this.facade.error() ?? failureFallback, life: 5000 },
    );
  }
}
