import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import {
  AdminConfirmDialogComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { UserSessionDto } from '../../models/security.model';
import { MySessionsFacade } from '../../services/my-sessions.facade';

/**
 * Self-service Active Sessions page — "this is what's signed in as me, right now." Distinct from
 * the Security Center's Sessions & Devices tab, which is an admin investigating *other* users.
 * Reached from the admin topbar profile menu, not the main sidebar nav (it's account-level, not a
 * managed resource, so it carries no permission gate beyond being an authenticated admin).
 */
@Component({
  selector: 'app-my-sessions-page',
  standalone: true,
  imports: [
    DatePipe,
    TranslatePipe,
    ButtonModule,
    TableModule,
    ToastModule,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminIconButtonComponent,
    AdminStatusBadgeComponent,
    AdminConfirmDialogComponent,
  ],
  providers: [MySessionsFacade],
  templateUrl: './my-sessions-page.component.html',
  styleUrl: './my-sessions-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MySessionsPageComponent implements OnInit {
  protected readonly facade = inject(MySessionsFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'ADMIN.MY_SESSIONS.TITLE' });

  protected readonly revokeAllDialogOpen = signal(false);
  protected readonly revokeTarget = signal<UserSessionDto | null>(null);

  ngOnInit(): void {
    void this.facade.loadSessions();
  }

  protected deviceLabel(session: UserSessionDto): string {
    const browser = session.browserName ?? this.translate.instant('ADMIN.MY_SESSIONS.UNKNOWN');
    const device = session.deviceName ?? this.translate.instant('ADMIN.MY_SESSIONS.UNKNOWN');
    return `${browser} · ${device}`;
  }

  protected openRevokeConfirm(session: UserSessionDto): void {
    this.revokeTarget.set(session);
  }

  protected onRevokeDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.revokeTarget.set(null);
    }
  }

  protected async confirmRevoke(): Promise<void> {
    const target = this.revokeTarget();
    this.revokeTarget.set(null);
    if (!target) return;

    const success = await this.facade.revokeSession(target.id);
    this.finishAction(success);
  }

  protected async confirmRevokeAllOthers(): Promise<void> {
    this.revokeAllDialogOpen.set(false);
    const success = await this.facade.revokeAllOtherSessions();
    this.finishAction(success);
  }

  private finishAction(success: boolean): void {
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.MY_SESSIONS.MESSAGES.ACTION_SUCCEEDED'),
        life: 4000,
      });
      void this.facade.loadSessions();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.MY_SESSIONS.MESSAGES.ACTION_FAILED'),
        detail: this.facade.error() ?? '',
        life: 5000,
      });
    }
  }
}
