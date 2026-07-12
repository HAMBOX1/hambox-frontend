import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly backLink = input<string | null>(null);
  readonly backLabel = input<string>('Back');
  readonly breadcrumbs = input<AdminBreadcrumbItem[]>([]);
}

export type { AdminBreadcrumbItem };