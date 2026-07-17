import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';

import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminDataTableShellComponent,
  AdminErrorAlertComponent,
  AdminPageHeaderComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { CommunicationProviderConfigDto } from '../../models/communication.model';
import { CommunicationFacade } from '../../services/communication.facade';

@Component({
  selector: 'app-communication-providers-page',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    InputNumberModule,
    TableModule,
    ToggleSwitchModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
  ],
  providers: [CommunicationFacade, MessageService],
  templateUrl: './communication-providers-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunicationProvidersPageComponent implements OnInit {
  protected readonly facade = inject(CommunicationFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Communication', route: '/admin/communication' }, { label: 'Providers' });

  protected readonly providers = this.facade.providers;
  protected readonly loading = this.facade.providersLoading;
  protected readonly error = this.facade.providersError;
  protected readonly actionLoading = this.facade.actionLoading;

  ngOnInit(): void {
    void this.facade.loadProviders();
  }

  protected retryLoad(): void {
    void this.facade.loadProviders();
  }

  protected async toggleEnabled(provider: CommunicationProviderConfigDto, enabled: boolean): Promise<void> {
    const success = await this.facade.updateProvider(provider.id, enabled, provider.priority);
    if (!success) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.COMMUNICATION.PROVIDERS.MESSAGES.UPDATE_FAILED'),
        detail: this.facade.providersError() ?? '',
        life: 5000,
      });
    }
  }

  protected async updatePriority(provider: CommunicationProviderConfigDto, priority: number): Promise<void> {
    const success = await this.facade.updateProvider(provider.id, provider.isEnabled, priority);
    if (!success) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.COMMUNICATION.PROVIDERS.MESSAGES.UPDATE_FAILED'),
        detail: this.facade.providersError() ?? '',
        life: 5000,
      });
    }
  }
}
