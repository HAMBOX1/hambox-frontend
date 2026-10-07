import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import {
  AdminErrorAlertComponent,
  AdminPageHeaderComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { CommunicationFacade } from '../../services/communication.facade';

@Component({
  selector: 'app-communication-dashboard-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, AdminPageHeaderComponent, AdminStatGridComponent, AdminStatCardComponent, AdminErrorAlertComponent],
  providers: [CommunicationFacade],
  templateUrl: './communication-dashboard-page.component.html',
  styleUrl: './communication-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunicationDashboardPageComponent implements OnInit {
  protected readonly facade = inject(CommunicationFacade);
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Communication' });

  protected readonly navLinks = [
    {
      route: '/admin/communication/templates',
      icon: 'pi-file-edit',
      titleKey: 'ADMIN.COMMUNICATION.NAV.TEMPLATES',
      descriptionKey: 'ADMIN.COMMUNICATION.TEMPLATES.SUBTITLE',
    },
    {
      route: '/admin/communication/messages',
      icon: 'pi-bell',
      titleKey: 'ADMIN.COMMUNICATION.NAV.MESSAGES',
      descriptionKey: 'ADMIN.COMMUNICATION.MESSAGES.SUBTITLE',
    },
    {
      route: '/admin/communication/failed-deliveries',
      icon: 'pi-exclamation-triangle',
      titleKey: 'ADMIN.COMMUNICATION.NAV.FAILED_DELIVERIES',
      descriptionKey: 'ADMIN.COMMUNICATION.FAILED_DELIVERIES.SUBTITLE',
    },
    {
      route: '/admin/communication/providers',
      icon: 'pi-send',
      titleKey: 'ADMIN.COMMUNICATION.NAV.PROVIDERS',
      descriptionKey: 'ADMIN.COMMUNICATION.PROVIDERS.SUBTITLE',
    },
  ] as const;

  protected readonly stats = this.facade.stats;
  protected readonly loading = this.facade.statsLoading;
  protected readonly error = this.facade.statsError;

  protected readonly averageDeliveryLabel = computed(() => {
    const seconds = this.stats()?.averageDeliverySeconds;
    if (seconds === null || seconds === undefined) {
      return '—';
    }

    return seconds < 60 ? `${Math.round(seconds)}s` : `${Math.round(seconds / 60)}m`;
  });

  ngOnInit(): void {
    void this.facade.loadDashboardStats();
  }

  protected retryLoad(): void {
    void this.facade.loadDashboardStats();
  }
}
