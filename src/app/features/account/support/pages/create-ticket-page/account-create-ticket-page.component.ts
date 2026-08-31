import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { EditorModule } from 'primeng/editor';

import { HamboxTranslateRefreshDirective } from '../../../../../shared/directives/hambox-translate-refresh.directive';
import { SupportTicketsStore } from '../../../../../core/support/support-tickets.store';
import { AccountSupportFacade } from '../../services/account-support.facade';
import { AccountOrdersFacade } from '../../../services/account-orders.facade';
import { SupportSubnavComponent } from '../../components/support-subnav/support-subnav.component';

function attachmentKindLabel(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'pi-image';
  if (ext === 'pdf') return 'pi-file-pdf';
  if (['zip', 'rar'].includes(ext)) return 'pi-box';
  if (['log', 'txt'].includes(ext)) return 'pi-file-edit';
  if (['mp4', 'mov', 'webm'].includes(ext)) return 'pi-video';
  return 'pi-file';
}

@Component({
  selector: 'app-account-create-ticket-page',
  standalone: true,
  imports: [FormsModule, TranslatePipe, EditorModule, HamboxTranslateRefreshDirective, SupportSubnavComponent],
  templateUrl: './account-create-ticket-page.component.html',
  styleUrl: './account-create-ticket-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCreateTicketPageComponent {
  private readonly facade = inject(AccountSupportFacade);
  private readonly store = inject(SupportTicketsStore);
  private readonly ordersFacade = inject(AccountOrdersFacade);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly categories = this.store.categories;
  protected readonly priorities = this.store.priorities;
  protected readonly orders = this.ordersFacade.orders;

  protected readonly categoryId = signal<string | null>(null);
  protected readonly priorityId = signal<string | null>(null);
  protected readonly subject = signal('');
  protected readonly descriptionHtml = signal('');
  protected readonly relatedOrderNumber = signal('');
  protected readonly relatedProductName = signal('');
  protected readonly attachments = signal<readonly File[]>([]);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly dragActive = signal(false);

  protected readonly subjectError = () => (this.submitted() && !this.subject().trim() ? 'SUPPORT.CREATE.ERRORS.SUBJECT_REQUIRED' : null);
  protected readonly descriptionError = () =>
    this.submitted() && this.plainTextLength(this.descriptionHtml()) === 0 ? 'SUPPORT.CREATE.ERRORS.DESCRIPTION_REQUIRED' : null;

  constructor() {
    void this.store.loadLookups();
    void this.ordersFacade.loadOrders();

    const params = this.route.snapshot.queryParamMap;
    const subject = params.get('subject');
    const orderNumber = params.get('orderNumber');
    if (subject) {
      this.subject.set(subject);
    }
    if (orderNumber) {
      this.relatedOrderNumber.set(orderNumber);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  protected onDragLeave(): void {
    this.dragActive.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    this.addFiles(event.dataTransfer?.files ?? null);
  }

  protected onFileInputChange(event: Event): void {
    this.addFiles((event.target as HTMLInputElement).files);
    (event.target as HTMLInputElement).value = '';
  }

  protected removeAttachment(file: File): void {
    this.attachments.update((list) => list.filter((f) => f !== file));
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.subjectError() || this.descriptionError()) {
      return;
    }

    this.submitting.set(true);
    try {
      const ticketId = await this.facade.createTicket({
        categoryId: this.categoryId(),
        priorityId: this.priorityId(),
        subject: this.subject().trim(),
        descriptionHtml: this.descriptionHtml(),
        relatedOrderNumber: this.relatedOrderNumber().trim() || null,
        relatedProductName: this.relatedProductName().trim() || null,
      });

      for (const file of this.attachments()) {
        await this.facade.uploadAttachment(ticketId, file);
      }

      void this.router.navigate(['/account/support/tickets', ticketId]);
    } finally {
      this.submitting.set(false);
    }
  }

  private addFiles(files: FileList | null): void {
    if (!files?.length) {
      return;
    }
    this.attachments.update((list) => [...list, ...Array.from(files)]);
  }

  protected attachmentIcon(file: File): string {
    return attachmentKindLabel(file.name);
  }

  protected attachmentSizeKb(file: File): number {
    return Math.max(1, Math.round(file.size / 1024));
  }

  private plainTextLength(html: string): number {
    return html.replace(/<[^>]*>/g, '').trim().length;
  }
}
