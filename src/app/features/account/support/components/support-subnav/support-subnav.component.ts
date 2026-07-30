import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AssistantFacade } from '../../../../assistant/services/assistant.facade';

interface SupportSubnavItem {
  readonly labelKey: string;
  readonly route: string;
  readonly icon: string;
  readonly exact?: boolean;
}

const NAV_ITEMS: readonly SupportSubnavItem[] = [
  { labelKey: 'SUPPORT.SUBNAV.HOME', route: '/account/support', icon: 'pi-home', exact: true },
  { labelKey: 'SUPPORT.SUBNAV.OPEN', route: '/account/support/tickets/open', icon: 'pi-inbox' },
  { labelKey: 'SUPPORT.SUBNAV.CLOSED', route: '/account/support/tickets/closed', icon: 'pi-verified' },
  { labelKey: 'SUPPORT.SUBNAV.CREATE', route: '/account/support/tickets/new', icon: 'pi-plus-circle' },
  { labelKey: 'SUPPORT.SUBNAV.KNOWLEDGE_BASE', route: '/account/support/knowledge-base', icon: 'pi-book' },
];

@Component({
  selector: 'app-support-subnav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './support-subnav.component.html',
  styleUrl: './support-subnav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportSubnavComponent {
  private readonly assistant = inject(AssistantFacade);

  protected readonly navItems = NAV_ITEMS;

  protected openAiAssistant(): void {
    this.assistant.open();
  }
}
