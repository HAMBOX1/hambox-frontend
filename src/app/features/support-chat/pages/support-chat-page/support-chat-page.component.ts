import { Component } from '@angular/core';

import { MobileTopBarComponent } from '../../../../shared/components/mobile-top-bar/mobile-top-bar.component';

@Component({
  selector: 'app-support-chat-page',
  standalone: true,
  imports: [MobileTopBarComponent],
  template: `
    <app-mobile-top-bar />
    <div class="support-chat-page">
      <p>support-chat works!</p>
    </div>
  `,
  styles: `
    .support-chat-page {
      padding: 1rem 1rem calc(1rem + var(--hambox-mobile-bottom-inset, 0px));
    }

    @media (min-width: 768px) {
      .support-chat-page {
        padding: 2rem;
      }
    }
  `,
})
export class SupportChatPageComponent {}
