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

const AUTOSAVE_DEBOUNCE_MS = 1500;

@Component({
  selector: 'app-product-instructions-panel',
  standalone: true,
  imports: [
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
  private readonly facade = inject(ProductInstructionsFacade);
  private readonly messageService = inject(MessageService);

  readonly productId = input<string | null>(null);

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

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const productId = this.productId();
      if (!productId) {
        return;
      }
      void this.facade.load(productId);
    });

    effect(() => {
      const saved = this.instructions();
      this.titleState.set(saved?.title ?? '');
      this.contentState.set(saved?.contentHtml ?? '');
    });
  }

  protected onTitleChange(value: string): void {
    this.titleState.set(value);
    this.scheduleAutosave();
  }

  protected onContentChange(value: string): void {
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
    const published = await this.facade.publish(productId);
    this.notify(published, 'Instructions published.', 'Failed to publish instructions.');
  }

  protected async onUnpublish(): Promise<void> {
    const productId = this.productId();
    if (!productId) {
      return;
    }
    this.unpublishConfirmOpen.set(false);
    const unpublished = await this.facade.unpublish(productId);
    this.notify(unpublished, 'Instructions unpublished.', 'Failed to unpublish instructions.');
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
      void this.facade.save(productId, this.titleState(), this.contentState());
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

    await this.facade.save(productId, this.titleState(), this.contentState());
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
        summary: 'Image upload failed',
        detail: this.facade.error() ?? 'Unable to upload this image.',
        life: 5000,
      });
    }
    return url;
  }

  private notify(success: boolean, successDetail: string, failureFallback: string): void {
    this.messageService.add(
      success
        ? { severity: 'success', summary: 'Instructions', detail: successDetail, life: 4000 }
        : { severity: 'error', summary: 'Instructions', detail: this.facade.error() ?? failureFallback, life: 5000 },
    );
  }
}
