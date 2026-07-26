import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AssistantFacade } from '../../../assistant/services/assistant.facade';

@Component({
  selector: 'app-order-support-sidebar',
  standalone: true,
  templateUrl: './order-support-sidebar.component.html',
  styleUrl: './order-support-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSupportSidebarComponent {
  private readonly assistant = inject(AssistantFacade);

  protected openAssistant(): void {
    this.assistant.open();
  }
}
