import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { EditorModule } from 'primeng/editor';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { AdminSectionCardComponent } from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductApiService } from '../../services/product-api.service';

/**
 * The product's own "How to use" text: shown to every visitor on the product page, in the "How to Redeem" section, in
 * place of the generic steps. (The Instructions panel next to it is different: that one is a private guide only the
 * customers who bought the product can read.)
 */
@Component({
  selector: 'app-product-usage-instructions-card',
  standalone: true,
  imports: [TranslatePipe, FormsModule, ButtonModule, EditorModule, ToastModule, HasPermissionDirective, AdminSectionCardComponent],
  providers: [MessageService],
  template: `
    <p-toast position="top-right" />

    <app-admin-section-card
      [title]="'ADMIN.CATALOG_UI.USAGE_TITLE' | translate"
      [description]="'ADMIN.CATALOG_UI.USAGE_DESC' | translate"
      [compact]="true"
    >
      @if (!productId()) {
        <p class="usage-card__hint">{{ 'ADMIN.CATALOG_UI.SAVE_THE_PRODUCT_FIRST_TO_START_WRITING_INST' | translate }}</p>
      } @else {
        <p-editor [ngModel]="content()" (ngModelChange)="content.set($event ?? '')" [style]="{ height: '220px' }" />

        <div class="usage-card__actions">
          <button
            *hamboxHasPermission="permissions.Catalog.Products.Edit"
            pButton
            type="button"
            icon="pi pi-check"
            [label]="'ADMIN.CATALOG_UI.USAGE_SAVE' | translate"
            [loading]="saving()"
            [disabled]="!dirty() || saving()"
            (click)="save()"
          ></button>
          @if (saved()) {
            <button
              *hamboxHasPermission="permissions.Catalog.Products.Edit"
              pButton
              type="button"
              severity="secondary"
              [outlined]="true"
              icon="pi pi-times"
              [label]="'ADMIN.CATALOG_UI.USAGE_CLEAR' | translate"
              [disabled]="saving()"
              (click)="clear()"
            ></button>
          }
          @if (dirty()) {
            <span class="usage-card__dirty">{{ 'ADMIN.CATALOG_UI.UNSAVED_CHANGES' | translate }}</span>
          }
        </div>
      }
    </app-admin-section-card>
  `,
  styles: `
    .usage-card__hint {
      margin: 0;
      color: var(--color-text-secondary);
    }

    .usage-card__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
      margin-top: 0.85rem;
    }

    .usage-card__dirty {
      font-size: 0.8125rem;
      color: var(--admin-accent-amber, #f59e0b);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductUsageInstructionsCardComponent {
  private readonly productApi = inject(ProductApiService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;

  readonly productId = input<string | null>(null);
  /** What the product currently has saved (null/empty = nothing). */
  readonly html = input<string | null>(null);

  protected readonly content = signal('');
  /** The last value that is saved on the server — what "unsaved changes" is measured against. */
  private readonly savedContent = signal('');
  protected readonly saving = signal(false);

  protected readonly dirty = computed(() => this.content() !== this.savedContent());
  protected readonly saved = computed(() => this.savedContent().trim().length > 0);

  constructor() {
    // Load what the product has whenever another product (or a fresh copy) arrives.
    effect(() => {
      const incoming = this.html() ?? '';
      this.content.set(incoming);
      this.savedContent.set(incoming);
    });
  }

  protected async save(): Promise<void> {
    await this.persist(this.content(), 'ADMIN.CATALOG_UI.USAGE_SAVED');
  }

  protected async clear(): Promise<void> {
    await this.persist('', 'ADMIN.CATALOG_UI.USAGE_CLEARED');
  }

  private async persist(html: string, successKey: string): Promise<void> {
    const productId = this.productId();
    if (!productId || this.saving()) {
      return;
    }

    this.saving.set(true);
    try {
      await firstValueFrom(this.productApi.setUsageInstructions(productId, html));
      this.content.set(html);
      this.savedContent.set(html);
      this.messageService.add({ severity: 'success', summary: this.translate.instant(successKey), life: 3500 });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: error instanceof ApiError && error.message ? error.message : this.translate.instant('ADMIN.CATALOG_UI.USAGE_FAILED'),
        life: 6000,
      });
    } finally {
      this.saving.set(false);
    }
  }
}
