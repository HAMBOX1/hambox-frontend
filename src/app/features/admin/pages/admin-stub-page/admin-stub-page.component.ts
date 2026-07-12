import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import {
  AdminEmptyStateComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
} from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';
import type { AdminBreadcrumbItem } from '../../../../shared/components/admin';

@Component({
  selector: 'app-admin-stub-page',
  standalone: true,
  imports: [
    TranslatePipe,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminEmptyStateComponent,
  ],
  templateUrl: './admin-stub-page.component.html',
  styleUrl: './admin-stub-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStubPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly title = toSignal(
    this.route.data.pipe(map((data) => (data['title'] as string) ?? 'Admin')),
    { initialValue: 'Admin' },
  );

  protected readonly description = toSignal(
    this.route.data.pipe(
      map(
        (data) =>
          (data['description'] as string) ??
          'This section will be available in a future sprint.',
      ),
    ),
    { initialValue: 'This section will be available in a future sprint.' },
  );

  protected readonly breadcrumbs = computed<AdminBreadcrumbItem[]>(() =>
    adminBreadcrumbs({ label: this.title() }),
  );

  protected readonly stubIcon = computed(() => {
    switch (this.title()) {
      case 'Dashboard':
        return 'pi pi-chart-bar';
      case 'Orders':
        return 'pi pi-shopping-bag';
      case 'Analytics':
        return 'pi pi-chart-line';
      case 'Settings':
        return 'pi pi-cog';
      default:
        return 'pi pi-wrench';
    }
  });

  protected navigateInventory(): void {
    void this.router.navigate(['/admin/products']);
  }
}
