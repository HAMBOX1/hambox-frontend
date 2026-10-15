import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { SUPPORT_CONTACT_API } from '../../../core/api/api-endpoints';
import { buildSupportMessage, buildWhatsAppSupportUrl } from '../../utils/whatsapp-support.util';
import { StorefrontFooterContentService } from '../storefront-footer/storefront-footer-content.service';

/**
 * "Contact support on WhatsApp" with the order / product already written into the message, and every click
 * recorded so support can see what customers needed help with (audit R51). Hidden when the store has no
 * WhatsApp link configured.
 */
@Component({
  selector: 'app-whatsapp-support-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (href(); as link) {
      <a class="wa-support" [href]="link" target="_blank" rel="noopener noreferrer" (click)="logClick()">
        <span aria-hidden="true">💬</span>
        <span>{{ label() }}</span>
      </a>
    }
  `,
  styles: `
    .wa-support {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1rem;
      border-radius: 0.75rem;
      background: #25d366;
      color: #06260f;
      font-weight: 600;
      text-decoration: none;
    }
    .wa-support:hover {
      filter: brightness(1.05);
    }
  `,
})
export class WhatsAppSupportButtonComponent {
  private readonly footer = inject(StorefrontFooterContentService);
  private readonly api = inject(ApiClientService);
  private readonly router = inject(Router);

  /** Where the button sits ("order-detail", "order-success", "library", "product"…) — stored with the click. */
  readonly context = input<string>('general');
  readonly orderId = input<string | null>(null);
  readonly orderNumber = input<string | null>(null);
  readonly productId = input<string | null>(null);
  readonly productName = input<string | null>(null);
  readonly label = input<string>('Chat with support on WhatsApp');

  protected readonly href = computed(() =>
    buildWhatsAppSupportUrl(
      this.footer.footer()?.whatsAppUrl,
      buildSupportMessage({ orderNumber: this.orderNumber(), productName: this.productName() }),
    ),
  );

  constructor() {
    this.footer.load();
  }

  protected logClick(): void {
    // Fire-and-forget: a failed log must never get in the way of opening the chat.
    void firstValueFrom(
      this.api.post<void>(SUPPORT_CONTACT_API.click, {
        channel: 'whatsapp',
        context: this.context(),
        orderId: this.orderId(),
        productId: this.productId(),
        page: this.router.url.split('?')[0],
      }),
    ).catch(() => undefined);
  }
}
