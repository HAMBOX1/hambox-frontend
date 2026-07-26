import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AssistantFacade } from '../../../assistant/services/assistant.facade';

/**
 * The AI assistant is now a global floating widget (see MainLayoutComponent),
 * not a dedicated page. This route only exists so old links/bookmarks still work.
 */
@Component({
  selector: 'app-support-chat-page',
  standalone: true,
  template: ``,
})
export class SupportChatPageComponent {
  constructor() {
    const assistant = inject(AssistantFacade);
    const router = inject(Router);
    assistant.open();
    void router.navigate(['/'], { replaceUrl: true });
  }
}
