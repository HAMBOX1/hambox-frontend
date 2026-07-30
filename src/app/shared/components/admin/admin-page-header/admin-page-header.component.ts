import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminPageTitleService } from '../../../../features/admin/services/admin-page-title.service';
import {
  AdminBreadcrumbComponent,
  type AdminBreadcrumbItem,
} from '../admin-breadcrumb/admin-breadcrumb.component';

@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  imports: [RouterLink, AdminBreadcrumbComponent],
  templateUrl: './admin-page-header.component.html',
  styleUrl: './admin-page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPageHeaderComponent {
  private readonly pageTitle = inject(AdminPageTitleService);

  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly backLink = input<string | null>(null);
  readonly backLabel = input<string>('Back');
  readonly breadcrumbs = input<AdminBreadcrumbItem[]>([]);
  readonly compactActions = input(false);
  readonly stackedActions = input(false);

  constructor() {
    // The page title now renders in the topbar (see AdminTopbarComponent), reclaiming the
    // vertical space the in-page <h1> used to take — every admin page already passes `title`
    // here, so this is the single point that needs to forward it.
    effect(() => this.pageTitle.setTitle(this.title()));
  }
}

export type { AdminBreadcrumbItem };