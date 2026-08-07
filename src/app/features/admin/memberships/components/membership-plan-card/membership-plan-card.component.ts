import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

import {
  AdminActionMenuComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../../shared/components/admin';
import { HamboxCurrencyPipe } from '../../../../../shared/pipes/hambox-currency.pipe';
import { MembershipPlanListItemDto } from '../../models/membership-api.model';

/**
 * Dedicated mobile card for the plans list — not the Products card pattern. Membership plans are
 * few and reviewed one at a time (price/status/subscriber count, then either edit or drill in), so
 * the layout optimizes for a single thumb: the whole card is one tap target for "view", and the two
 * remaining actions (Edit, overflow) sit in a fixed-height bottom row reachable without repositioning
 * the hand, instead of small top-corner icons.
 */
@Component({
  selector: 'app-membership-plan-card',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    ButtonModule,
    HamboxCurrencyPipe,
    AdminStatusBadgeComponent,
    AdminActionMenuComponent,
  ],
  templateUrl: './membership-plan-card.component.html',
  styleUrl: './membership-plan-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipPlanCardComponent {
  readonly plan = input.required<MembershipPlanListItemDto>();
  readonly statusTone = input<AdminStatusTone>('neutral');
  readonly menuItems = input<MenuItem[]>([]);
  readonly canEdit = input(false);
  readonly menuDisabled = input(false);
}
