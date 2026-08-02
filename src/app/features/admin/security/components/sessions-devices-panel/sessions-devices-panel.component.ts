import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';

import {
  AdminActionMenuComponent,
  AdminConfirmDialogComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminSearchBarComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { TrustedDeviceDto } from '../../models/security.model';
import { SecurityManagementFacade } from '../../services/security-management.facade';
import { activateOnceWhenTrue } from '../../utils/lazy-tab-activation';

/**
 * Trusted Devices table + the active-sessions panel for whichever user is currently selected —
 * combined in one tab since a session belongs to a device and admins investigate them together.
 * Reached either by clicking a device row here, or deep-linked from the Users tab via
 * `[initialUserId]`.
 */
@Component({
  selector: 'app-sessions-devices-panel',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    SelectModule,
    TableModule,
    TextareaModule,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminIconButtonComponent,
    AdminActionMenuComponent,
    AdminConfirmDialogComponent,
    AdminStatusBadgeComponent,
    AdminSectionCardComponent,
  ],
  templateUrl: './sessions-devices-panel.component.html',
  styleUrl: './sessions-devices-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsDevicesPanelComponent {
  readonly initialUserId = input<string | null>(null);
  readonly active = input(false);

  protected readonly facade = inject(SecurityManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly deviceSearchTerm = signal('');
  protected readonly deviceStatusFilter = signal('all');
  protected readonly devicePage = signal(1);
  protected readonly devicePageSize = signal(20);
  protected readonly devices = computed(() => this.facade.devices()?.items ?? []);
  protected readonly devicesTotal = computed(() => this.facade.devices()?.totalCount ?? 0);
  protected readonly deviceTableFirst = computed(() => (this.devicePage() - 1) * this.devicePageSize());

  protected readonly selectedUserId = signal<string | null>(null);
  protected readonly selectedUserEmail = signal<string | null>(null);
  protected readonly sessions = this.facade.userSessions;

  protected readonly blockDeviceDialogOpen = signal(false);
  protected readonly blockDeviceTarget = signal<TrustedDeviceDto | null>(null);
  protected readonly blockReason = signal('');

  protected readonly revokeAllDialogOpen = signal(false);

  protected readonly deviceStatusOptions: { label: string; value: string }[] = [
    { label: 'All devices', value: 'all' },
    { label: 'Trusted', value: 'trusted' },
    { label: 'Blocked', value: 'blocked' },
    { label: 'New / unrecognized', value: 'new' },
  ];

  constructor() {
    activateOnceWhenTrue(this.active, () => this.reloadDevices());

    effect(() => {
      const id = this.initialUserId();
      if (id) {
        this.selectUser(id, null);
      }
    });
  }

  protected onDeviceSearchChange(term: string): void {
    this.deviceSearchTerm.set(term);
    this.devicePage.set(1);
    this.reloadDevices();
  }

  protected onDeviceStatusFilterChange(value: string): void {
    this.deviceStatusFilter.set(value);
    this.devicePage.set(1);
    this.reloadDevices();
  }

  protected onDevicePageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.devicePageSize();
    const first = event.first ?? 0;
    this.devicePageSize.set(rows);
    this.devicePage.set(Math.floor(first / rows) + 1);
    this.reloadDevices();
  }

  protected deviceStatusTone(device: TrustedDeviceDto): AdminStatusTone {
    if (device.isBlocked) return 'danger';
    if (device.isTrusted) return 'success';
    return 'neutral';
  }

  protected deviceStatusLabel(device: TrustedDeviceDto): string {
    if (device.isBlocked) return this.translate.instant('ADMIN.SECURITY.DEVICES.STATUS.BLOCKED');
    if (device.isTrusted) return this.translate.instant('ADMIN.SECURITY.DEVICES.STATUS.TRUSTED');
    return this.translate.instant('ADMIN.SECURITY.DEVICES.STATUS.NEW');
  }

  protected deviceActionMenuItems(device: TrustedDeviceDto): MenuItem[] {
    const t = (key: string) => this.translate.instant(key);
    const items: MenuItem[] = [];

    if (device.isBlocked) {
      items.push({ label: t('ADMIN.SECURITY.DEVICES.ACTIONS.UNBLOCK'), icon: 'pi pi-lock-open', command: () => this.unblockDevice(device) });
    } else {
      items.push({
        label: device.isTrusted ? t('ADMIN.SECURITY.DEVICES.ACTIONS.UNTRUST') : t('ADMIN.SECURITY.DEVICES.ACTIONS.TRUST'),
        icon: device.isTrusted ? 'pi pi-times-circle' : 'pi pi-verified',
        command: () => (device.isTrusted ? this.untrustDevice(device) : this.trustDevice(device)),
      });
      items.push({
        label: t('ADMIN.SECURITY.DEVICES.ACTIONS.BLOCK'),
        icon: 'pi pi-ban',
        command: () => this.openBlockDeviceDialog(device),
      });
    }

    items.push({
      label: t('ADMIN.SECURITY.DEVICES.ACTIONS.VIEW_SESSIONS'),
      icon: 'pi pi-desktop',
      command: () => this.selectUser(device.userId, device.userEmail),
    });

    return items;
  }

  private async trustDevice(device: TrustedDeviceDto): Promise<void> {
    const success = await this.facade.trustDevice(device.id);
    this.finishDeviceAction(success);
  }

  private async untrustDevice(device: TrustedDeviceDto): Promise<void> {
    const success = await this.facade.untrustDevice(device.id);
    this.finishDeviceAction(success);
  }

  protected openBlockDeviceDialog(device: TrustedDeviceDto): void {
    this.blockDeviceTarget.set(device);
    this.blockReason.set('');
    this.blockDeviceDialogOpen.set(true);
  }

  protected async confirmBlockDevice(): Promise<void> {
    const device = this.blockDeviceTarget();
    if (!device) return;

    const success = await this.facade.blockDevice(device.id, { reason: this.blockReason().trim() || null });
    this.blockDeviceDialogOpen.set(false);
    this.finishDeviceAction(success);
  }

  private async unblockDevice(device: TrustedDeviceDto): Promise<void> {
    const success = await this.facade.unblockDevice(device.id);
    this.finishDeviceAction(success);
  }

  private finishDeviceAction(success: boolean): void {
    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant('ADMIN.SECURITY.MESSAGES.ACTION_SUCCEEDED'), life: 4000 });
      this.reloadDevices();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.SECURITY.MESSAGES.ACTION_FAILED'),
        detail: this.facade.devicesError() ?? '',
        life: 5000,
      });
    }
  }

  protected selectUser(userId: string, userEmail: string | null): void {
    this.selectedUserId.set(userId);
    this.selectedUserEmail.set(userEmail);
    void this.facade.loadUserSessions(userId);
  }

  protected async revokeSession(sessionId: string): Promise<void> {
    const userId = this.selectedUserId();
    if (!userId) return;

    const success = await this.facade.revokeUserSession(userId, sessionId);
    if (success) void this.facade.loadUserSessions(userId);
  }

  protected async confirmRevokeAllSessions(): Promise<void> {
    const userId = this.selectedUserId();
    this.revokeAllDialogOpen.set(false);
    if (!userId) return;

    const success = await this.facade.revokeAllUserSessions(userId);
    if (success) void this.facade.loadUserSessions(userId);
  }

  private reloadDevices(): void {
    const status = this.deviceStatusFilter();
    void this.facade.loadDevices(this.devicePage(), this.devicePageSize(), {
      searchTerm: this.deviceSearchTerm(),
      isTrusted: status === 'trusted' ? true : status === 'new' ? false : undefined,
      isBlocked: status === 'blocked' ? true : status === 'new' ? false : undefined,
    });
  }
}
