import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

export interface AdminBreadcrumbItem {
  label: string;
  route?: string | null;
}

@Component({
  selector: 'app-admin-breadcrumb',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './admin-breadcrumb.component.html',
  styleUrl: './admin-breadcrumb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBreadcrumbComponent {
  readonly items = input.required<AdminBreadcrumbItem[]>();
}
