import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AssistantFacade } from '../../../../assistant/services/assistant.facade';
import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { HamboxTranslateRefreshDirective } from '../../../../../shared/directives/hambox-translate-refresh.directive';
import { TICKET_STATUS_META } from '../../../../../core/support/support.model';
import { AccountSupportFacade } from '../../services/account-support.facade';
import { SupportSubnavComponent } from '../../components/support-subnav/support-subnav.component';
import { SupportChipComponent } from '../../components/support-chip/support-chip.component';

@Component({
  selector: 'app-account-support-home-page',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    HamboxDatePipe,
    HamboxTranslateRefreshDirective,
    SupportSubnavComponent,
    SupportChipComponent,
  ],
  templateUrl: './account-support-home-page.component.html',
  styleUrl: './account-support-home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSupportHomePageComponent {
  private readonly facade = inject(AccountSupportFacade);
  private readonly assistant = inject(AssistantFacade);

  protected readonly statusMeta = TICKET_STATUS_META;
  protected readonly displayName = this.facade.displayName;
  protected readonly openCount = computed(() => this.facade.openTickets().length);
  protected readonly waitingCount = this.facade.waitingForReplyCount;
  protected readonly resolvedCount = this.facade.resolvedCount;
  protected readonly totalCount = computed(() => this.facade.myTickets().length);
  protected readonly recentTickets = computed(() => this.facade.myTickets().slice(0, 5));

  constructor() {
    void this.facade.load();
  }

  protected openAiAssistant(): void {
    this.assistant.open();
  }
}
