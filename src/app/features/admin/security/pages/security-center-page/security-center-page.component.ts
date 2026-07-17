import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminConfirmDialogComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminSectionCardComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import {
  BlockedEmailDto,
  BlockedIpDto,
  BlockedUserListItemDto,
  CountryRestrictionDto,
  CountryRestrictionStatus,
} from '../../models/security.model';
import { SecurityManagementFacade } from '../../services/security-management.facade';

type UserActionMode = 'block' | 'suspend' | 'ban';
type TabKey = '0' | '1' | '2' | '3' | '4' | '5';

@Component({
  selector: 'app-security-center-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TabsModule,
    TextareaModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
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
    AdminStatCardComponent,
    AdminStatGridComponent,
  ],
  providers: [SecurityManagementFacade, MessageService],
  templateUrl: './security-center-page.component.html',
  styleUrl: './security-center-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityCenterPageComponent implements OnInit {
  protected readonly facade = inject(SecurityManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  protected readonly permissionService = inject(PermissionService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Security Center' });
  protected readonly countryStatusOptions: { label: string; value: CountryRestrictionStatus }[] = [
    { label: 'Allowed', value: 'Allowed' },
    { label: 'Blocked', value: 'Blocked' },
    { label: 'Temporarily Blocked', value: 'TemporarilyBlocked' },
  ];

  protected readonly activeTab = signal<TabKey>('0');

  // ── Users tab ─────────────────────────────────────────────
  protected readonly userSearchTerm = signal('');
  protected readonly userStatusFilter = signal('all');
  protected readonly userPage = signal(1);
  protected readonly userPageSize = signal(10);
  protected readonly users = computed(() => this.facade.users()?.items ?? []);
  protected readonly usersTotal = computed(() => this.facade.users()?.totalCount ?? 0);
  protected readonly userTableFirst = computed(() => (this.userPage() - 1) * this.userPageSize());

  protected readonly userActionDialogOpen = signal(false);
  protected readonly userActionMode = signal<UserActionMode>('block');
  protected readonly userActionTarget = signal<BlockedUserListItemDto | null>(null);
  protected readonly actionReason = signal('');
  protected readonly actionNotes = signal('');
  protected readonly actionExpiresOn = signal('');
  protected readonly unblockDialogOpen = signal(false);

  // ── Emails tab ────────────────────────────────────────────
  protected readonly emailSearchTerm = signal('');
  protected readonly emailPage = signal(1);
  protected readonly emailPageSize = signal(10);
  protected readonly emails = computed(() => this.facade.emails()?.items ?? []);
  protected readonly emailsTotal = computed(() => this.facade.emails()?.totalCount ?? 0);
  protected readonly emailTableFirst = computed(() => (this.emailPage() - 1) * this.emailPageSize());
  protected readonly emailDialogOpen = signal(false);
  protected readonly emailPattern = signal('');
  protected readonly deleteEmailTarget = signal<BlockedEmailDto | null>(null);
  protected readonly deleteEmailDialogOpen = signal(false);

  // ── IPs tab ───────────────────────────────────────────────
  protected readonly ipSearchTerm = signal('');
  protected readonly ipPage = signal(1);
  protected readonly ipPageSize = signal(10);
  protected readonly ips = computed(() => this.facade.ips()?.items ?? []);
  protected readonly ipsTotal = computed(() => this.facade.ips()?.totalCount ?? 0);
  protected readonly ipTableFirst = computed(() => (this.ipPage() - 1) * this.ipPageSize());
  protected readonly ipDialogOpen = signal(false);
  protected readonly ipCidrOrAddress = signal('');
  protected readonly deleteIpTarget = signal<BlockedIpDto | null>(null);
  protected readonly deleteIpDialogOpen = signal(false);

  // ── Countries tab ─────────────────────────────────────────
  protected readonly countrySearchTerm = signal('');
  protected readonly countryOverriddenOnly = signal(false);
  protected readonly countryDialogOpen = signal(false);
  protected readonly countryDialogTarget = signal<CountryRestrictionDto | null>(null);
  protected readonly countryStatus = signal<CountryRestrictionStatus>('Blocked');

  // ── Events tab ────────────────────────────────────────────
  protected readonly eventSearchTerm = signal('');
  protected readonly eventPage = signal(1);
  protected readonly eventPageSize = signal(20);
  protected readonly events = computed(() => this.facade.events()?.items ?? []);
  protected readonly eventsTotal = computed(() => this.facade.events()?.totalCount ?? 0);
  protected readonly eventTableFirst = computed(() => (this.eventPage() - 1) * this.eventPageSize());

  ngOnInit(): void {
    void this.facade.loadDashboard();
    this.reloadUsers();
  }

  protected onTabChange(value: string | number | undefined): void {
    const tab = String(value ?? '0') as TabKey;
    this.activeTab.set(tab);
    if (tab === '1' && !this.facade.users()) this.reloadUsers();
    if (tab === '2' && !this.facade.emails()) this.reloadEmails();
    if (tab === '3' && !this.facade.ips()) this.reloadIps();
    if (tab === '4' && this.facade.countries().length === 0) this.reloadCountries();
    if (tab === '5' && !this.facade.events()) this.reloadEvents();
  }

  // ── Users ─────────────────────────────────────────────────
  protected onUserSearchChange(term: string): void {
    this.userSearchTerm.set(term);
    this.userPage.set(1);
    this.reloadUsers();
  }

  protected onUserStatusChange(value: string): void {
    this.userStatusFilter.set(value);
    this.userPage.set(1);
    this.reloadUsers();
  }

  protected onUserPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.userPageSize();
    const first = event.first ?? 0;
    this.userPageSize.set(rows);
    this.userPage.set(Math.floor(first / rows) + 1);
    this.reloadUsers();
  }

  protected userStatusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Suspended':
        return 'warning';
      case 'Blocked':
      case 'Banned':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  protected userActionMenuItems(user: BlockedUserListItemDto): MenuItem[] {
    const items: MenuItem[] = [];
    const t = (key: string) => this.translate.instant(key);

    if (user.status === 'Active') {
      items.push(
        { label: t('ADMIN.SECURITY.USERS.ACTIONS.SUSPEND'), icon: 'pi pi-pause', command: () => this.openUserActionDialog('suspend', user) },
        { label: t('ADMIN.SECURITY.USERS.ACTIONS.BLOCK'), icon: 'pi pi-lock', command: () => this.openUserActionDialog('block', user) },
        { label: t('ADMIN.SECURITY.USERS.ACTIONS.BAN'), icon: 'pi pi-ban', command: () => this.openUserActionDialog('ban', user) },
      );
    } else if (user.status === 'Suspended' || user.status === 'Blocked' || user.status === 'Banned') {
      items.push({
        label: t('ADMIN.SECURITY.USERS.ACTIONS.RESTORE'),
        icon: 'pi pi-check',
        command: () => {
          this.userActionTarget.set(user);
          this.unblockDialogOpen.set(true);
        },
      });
    }

    return items;
  }

  protected openUserActionDialog(mode: UserActionMode, user: BlockedUserListItemDto): void {
    this.userActionMode.set(mode);
    this.userActionTarget.set(user);
    this.actionReason.set('');
    this.actionNotes.set('');
    this.actionExpiresOn.set('');
    this.userActionDialogOpen.set(true);
  }

  protected userActionDialogTitleKey(): string {
    return `ADMIN.SECURITY.USERS.ACTIONS.${this.userActionMode().toUpperCase()}`;
  }

  protected async confirmUserAction(): Promise<void> {
    const user = this.userActionTarget();
    const reason = this.actionReason().trim();
    if (!user || !reason) return;

    const mode = this.userActionMode();
    const expiresOnUtc = this.actionExpiresOn() ? new Date(this.actionExpiresOn()).toISOString() : null;
    const notes = this.actionNotes().trim() || null;

    const success =
      mode === 'block'
        ? await this.facade.blockUser(user.id, { reason, notes, expiresOnUtc })
        : mode === 'suspend'
          ? await this.facade.suspendUser(user.id, { reason, notes })
          : await this.facade.banUser(user.id, { reason, notes });

    this.finishUserAction(success);
  }

  protected async confirmUnblock(): Promise<void> {
    const user = this.userActionTarget();
    if (!user) return;

    const success = await this.facade.unblockUser(user.id);
    this.unblockDialogOpen.set(false);
    this.finishUserAction(success);
  }

  private finishUserAction(success: boolean): void {
    this.userActionDialogOpen.set(false);
    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant('ADMIN.SECURITY.MESSAGES.ACTION_SUCCEEDED'), life: 4000 });
      this.reloadUsers();
      void this.facade.loadDashboard();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.SECURITY.MESSAGES.ACTION_FAILED'),
        detail: this.facade.usersError() ?? '',
        life: 5000,
      });
    }
  }

  protected retryUsers(): void {
    this.reloadUsers();
  }

  private reloadUsers(): void {
    void this.facade.loadUsers(this.userPage(), this.userPageSize(), this.userSearchTerm(), this.userStatusFilter());
  }

  // ── Emails ────────────────────────────────────────────────
  protected onEmailSearchChange(term: string): void {
    this.emailSearchTerm.set(term);
    this.emailPage.set(1);
    this.reloadEmails();
  }

  protected onEmailPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.emailPageSize();
    const first = event.first ?? 0;
    this.emailPageSize.set(rows);
    this.emailPage.set(Math.floor(first / rows) + 1);
    this.reloadEmails();
  }

  protected openEmailDialog(): void {
    this.emailPattern.set('');
    this.actionReason.set('');
    this.actionNotes.set('');
    this.actionExpiresOn.set('');
    this.emailDialogOpen.set(true);
  }

  protected async confirmCreateEmail(): Promise<void> {
    const pattern = this.emailPattern().trim();
    const reason = this.actionReason().trim();
    if (!pattern || !reason) return;

    const success = await this.facade.createBlockedEmail({
      pattern,
      reason,
      notes: this.actionNotes().trim() || null,
      expiresOnUtc: this.actionExpiresOn() ? new Date(this.actionExpiresOn()).toISOString() : null,
    });

    this.emailDialogOpen.set(false);
    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant('ADMIN.SECURITY.MESSAGES.EMAIL_BLOCKED'), life: 4000 });
      this.reloadEmails();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.SECURITY.MESSAGES.ACTION_FAILED'),
        detail: this.facade.emailsError() ?? '',
        life: 5000,
      });
    }
  }

  protected requestDeleteEmail(email: BlockedEmailDto): void {
    this.deleteEmailTarget.set(email);
    this.deleteEmailDialogOpen.set(true);
  }

  protected async confirmDeleteEmail(): Promise<void> {
    const email = this.deleteEmailTarget();
    if (!email) return;

    const success = await this.facade.deleteBlockedEmail(email.id);
    this.deleteEmailDialogOpen.set(false);
    if (success) this.reloadEmails();
  }

  private reloadEmails(): void {
    void this.facade.loadEmails(this.emailPage(), this.emailPageSize(), this.emailSearchTerm());
  }

  // ── IPs ───────────────────────────────────────────────────
  protected onIpSearchChange(term: string): void {
    this.ipSearchTerm.set(term);
    this.ipPage.set(1);
    this.reloadIps();
  }

  protected onIpPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.ipPageSize();
    const first = event.first ?? 0;
    this.ipPageSize.set(rows);
    this.ipPage.set(Math.floor(first / rows) + 1);
    this.reloadIps();
  }

  protected openIpDialog(): void {
    this.ipCidrOrAddress.set('');
    this.actionReason.set('');
    this.actionNotes.set('');
    this.actionExpiresOn.set('');
    this.ipDialogOpen.set(true);
  }

  protected async confirmCreateIp(): Promise<void> {
    const cidrOrAddress = this.ipCidrOrAddress().trim();
    const reason = this.actionReason().trim();
    if (!cidrOrAddress || !reason) return;

    const success = await this.facade.createBlockedIp({
      cidrOrAddress,
      reason,
      notes: this.actionNotes().trim() || null,
      expiresOnUtc: this.actionExpiresOn() ? new Date(this.actionExpiresOn()).toISOString() : null,
    });

    this.ipDialogOpen.set(false);
    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant('ADMIN.SECURITY.MESSAGES.IP_BLOCKED'), life: 4000 });
      this.reloadIps();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.SECURITY.MESSAGES.ACTION_FAILED'),
        detail: this.facade.ipsError() ?? '',
        life: 5000,
      });
    }
  }

  protected requestDeleteIp(ip: BlockedIpDto): void {
    this.deleteIpTarget.set(ip);
    this.deleteIpDialogOpen.set(true);
  }

  protected async confirmDeleteIp(): Promise<void> {
    const ip = this.deleteIpTarget();
    if (!ip) return;

    const success = await this.facade.deleteBlockedIp(ip.id);
    this.deleteIpDialogOpen.set(false);
    if (success) this.reloadIps();
  }

  private reloadIps(): void {
    void this.facade.loadIps(this.ipPage(), this.ipPageSize(), this.ipSearchTerm());
  }

  // ── Countries ─────────────────────────────────────────────
  protected onCountrySearchChange(term: string): void {
    this.countrySearchTerm.set(term);
    this.reloadCountries();
  }

  protected onCountryOverriddenOnlyChange(value: boolean): void {
    this.countryOverriddenOnly.set(value);
    this.reloadCountries();
  }

  protected openCountryDialog(country: CountryRestrictionDto): void {
    this.countryDialogTarget.set(country);
    this.countryStatus.set(country.status === 'Allowed' ? 'Blocked' : country.status);
    this.actionReason.set(country.reason ?? '');
    this.actionNotes.set(country.notes ?? '');
    this.actionExpiresOn.set('');
    this.countryDialogOpen.set(true);
  }

  protected async confirmCountryRestriction(): Promise<void> {
    const country = this.countryDialogTarget();
    const reason = this.actionReason().trim();
    if (!country || !reason) return;

    const success = await this.facade.setCountryRestriction(country.countryCode, {
      status: this.countryStatus(),
      reason,
      notes: this.actionNotes().trim() || null,
      expiresOnUtc: this.actionExpiresOn() ? new Date(this.actionExpiresOn()).toISOString() : null,
    });

    this.countryDialogOpen.set(false);
    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant('ADMIN.SECURITY.MESSAGES.ACTION_SUCCEEDED'), life: 4000 });
      this.reloadCountries();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.SECURITY.MESSAGES.ACTION_FAILED'),
        detail: this.facade.countriesError() ?? '',
        life: 5000,
      });
    }
  }

  protected async clearCountryRestriction(country: CountryRestrictionDto): Promise<void> {
    const success = await this.facade.setCountryRestriction(country.countryCode, {
      status: 'Allowed',
      reason: 'Restriction cleared by administrator.',
    });
    if (success) this.reloadCountries();
  }

  protected countryStatusTone(status: CountryRestrictionStatus): AdminStatusTone {
    switch (status) {
      case 'Blocked':
        return 'danger';
      case 'TemporarilyBlocked':
        return 'warning';
      default:
        return 'success';
    }
  }

  private reloadCountries(): void {
    void this.facade.loadCountries(this.countrySearchTerm(), this.countryOverriddenOnly());
  }

  // ── Events ────────────────────────────────────────────────
  protected onEventSearchChange(term: string): void {
    this.eventSearchTerm.set(term);
    this.eventPage.set(1);
    this.reloadEvents();
  }

  protected onEventPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.eventPageSize();
    const first = event.first ?? 0;
    this.eventPageSize.set(rows);
    this.eventPage.set(Math.floor(first / rows) + 1);
    this.reloadEvents();
  }

  protected eventSeverityTone(severity: string): AdminStatusTone {
    switch (severity) {
      case 'Critical':
      case 'High':
        return 'danger';
      case 'Medium':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  protected retryDashboard(): void {
    void this.facade.loadDashboard();
  }

  private reloadEvents(): void {
    void this.facade.loadEvents(this.eventPage(), this.eventPageSize(), { searchTerm: this.eventSearchTerm() });
  }
}
