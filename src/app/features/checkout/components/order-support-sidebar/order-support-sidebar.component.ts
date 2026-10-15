import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { WhatsAppSupportButtonComponent } from '../../../../shared/components/whatsapp-support-button/whatsapp-support-button.component';

import { AssistantFacade } from '../../../assistant/services/assistant.facade';

@Component({
  selector: 'app-order-support-sidebar',
  standalone: true,
  imports: [WhatsAppSupportButtonComponent],
  templateUrl: './order-support-sidebar.component.html',
  styleUrl: './order-support-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSupportSidebarComponent {
  private readonly assistant = inject(AssistantFacade);

  readonly orderNumber = input<string | null>(null);

  protected openAssistant(): void {
    this.assistant.open();
  }
}
