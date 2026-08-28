import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { HasUnsavedChanges } from '../../../../../core/guards/unsaved-changes.guard';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminConfirmDialogComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminUnsavedChangesDialogComponent,
} from '../../../../../shared/components/admin';
import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import {
  CODESWHOLESALE_BASE_URLS,
  SUPPLIER_AUTH_TYPE_OPTIONS,
  SUPPLIER_FIXED_BASE_URLS,
  SupplierAuthenticationType,
} from '../../models/supplier.model';
import { SuppliersManagementFacade } from '../../services/suppliers-management.facade';

@Component({
  selector: 'app-supplier-detail-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    InputNumberModule,
    PasswordModule,
    SelectModule,
    TextareaModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminSectionCardComponent,
    AdminUnsavedChangesDialogComponent,
    AdminConfirmDialogComponent,
    AdminStatusBadgeComponent,
    AdminActionMenuComponent,
    HamboxDatePipe,
  ],
  providers: [SuppliersManagementFacade, MessageService],
  templateUrl: './supplier-detail-page.component.html',
  styleUrl: './supplier-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierDetailPageComponent implements OnInit, HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);
  protected readonly facade = inject(SuppliersManagementFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly authTypeOptions = [...SUPPLIER_AUTH_TYPE_OPTIONS];
  protected readonly supplierId = signal<string | null>(null);
  protected readonly isCreateMode = computed(() => this.supplierId() === null);

  protected readonly detail = this.facade.detail;
  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailError = this.facade.detailError;
  protected readonly saving = this.facade.saving;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly providerTypes = this.facade.providerTypes;
  protected readonly testResult = this.facade.testResult;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    providerType: ['Manual', Validators.required],
    authenticationType: ['None' as SupplierAuthenticationType, Validators.required],
    baseUrl: [''],
    priority: [100, [Validators.required, Validators.min(0)]],
    supportsInventorySync: [false],
    supportsPriceSync: [false],
    supportsReservations: [false],
    supportsOrderStatus: [false],
    supportsWebhooks: [false],
    settingsJson: [''],
  });

  protected readonly credentialsForm = this.fb.nonNullable.group({
    apiKey: [''],
    apiSecret: [''],
    username: [''],
    password: [''],
    bearerToken: [''],
    oAuthSettingsJson: [''],
  });

  /**
   * Bamboo's friendlier stand-in for the raw `settingsJson` textarea — round-tripped to/from
   * `{"accountId": N}` (see `currentSettingsJsonValue`/`patchForm`). Every other provider keeps using
   * the generic textarea; this is the one Bamboo-specific concession requirement 6 explicitly asks for.
   */
  protected readonly bambooAccountIdControl = this.fb.control<number | null>(null, [Validators.min(1)]);

  /**
   * CodesWholesale's friendlier stand-in for the raw `settingsJson` textarea — round-tripped to/from
   * `{"environment": "Sandbox" | "Production"}` (see `currentSettingsJsonValue`/`patchForm`), the same
   * pattern `bambooAccountIdControl` already uses. Defaults to Sandbox so a brand-new supplier can never
   * accidentally start configured for Production.
   */
  protected readonly codesWholesaleEnvironmentControl = this.fb.nonNullable.control<'Sandbox' | 'Production'>('Sandbox');
  protected readonly codesWholesaleEnvironmentOptions = [
    { label: 'Sandbox', value: 'Sandbox' as const },
    { label: 'Production', value: 'Production' as const },
  ];
  private readonly codesWholesaleEnvironment = toSignal(this.codesWholesaleEnvironmentControl.valueChanges, {
    initialValue: this.codesWholesaleEnvironmentControl.value,
  });

  protected readonly providerType = toSignal(this.form.controls.providerType.valueChanges, {
    initialValue: this.form.controls.providerType.value,
  });
  protected readonly authenticationType = toSignal(this.form.controls.authenticationType.valueChanges, {
    initialValue: this.form.controls.authenticationType.value,
  });

  /**
   * Providers whose HTTP endpoint is a fixed, backend-enforced constant — see `SUPPLIER_FIXED_BASE_URLS`.
   * Case-insensitive lookup: `providerType` is a free-typeable field (`p-select[editable]`), and the
   * backend's own registry resolves provider types case-insensitively too (`SupplierProviderRegistry.Resolve`).
   */
  protected readonly isCodesWholesaleProvider = computed(() => this.providerType().toLowerCase() === 'codeswholesale');

  /**
   * CodesWholesale is the one provider with two real hosts, not one — its hint is derived from the
   * `codesWholesaleEnvironmentControl` select rather than a static `SUPPLIER_FIXED_BASE_URLS` entry; see
   * `CODESWHOLESALE_BASE_URLS`'s remarks.
   */
  protected readonly fixedBaseUrl = computed(() => {
    if (this.isCodesWholesaleProvider()) {
      return CODESWHOLESALE_BASE_URLS[this.codesWholesaleEnvironment()];
    }

    const key = Object.keys(SUPPLIER_FIXED_BASE_URLS).find(
      (providerType) => providerType.toLowerCase() === this.providerType().toLowerCase(),
    );
    return key ? SUPPLIER_FIXED_BASE_URLS[key] : null;
  });
  protected readonly isBambooProvider = computed(() => this.providerType().toLowerCase() === 'bamboo');
  protected readonly isVisoriaProvider = computed(() => this.providerType().toLowerCase() === 'visoria');
  protected readonly isGlobeTopperProvider = computed(() => this.providerType().toLowerCase() === 'globetopper');
  protected readonly isEnebaProvider = computed(() => this.providerType().toLowerCase() === 'eneba');
  /** Providers whose real integration only ever implements purchase + order status — every other
   * capability checkbox would misrepresent what actually happens if left admin-editable (see the
   * effect() below, and `VisoriaSupplierProvider`/`BambooSupplierProvider`/`GlobeTopperSupplierProvider`/
   * `EnebaSupplierProvider`/`CodesWholesaleSupplierProvider`'s identical honest stubs — Eneba additionally
   * has no availability signal at all, see `GetAvailabilityAsync`'s remarks). */
  protected readonly hasLockedCapabilities = computed(
    () =>
      this.isBambooProvider() ||
      this.isVisoriaProvider() ||
      this.isGlobeTopperProvider() ||
      this.isEnebaProvider() ||
      this.isCodesWholesaleProvider(),
  );
  protected readonly authTypeLabel = computed(
    () => this.authTypeOptions.find((option) => option.value === this.authenticationType())?.label ?? this.authenticationType(),
  );

  /**
   * Which credential fields the selected authentication type actually needs — matches
   * `Supplier.HasCredentialsConfigured` on the backend field-for-field, so the UI never asks for (or
   * shows as "stored") a field that isn't part of that type's real readiness check.
   */
  protected readonly showsApiKeyPair = computed(() => this.authenticationType() === 'ApiKey' || this.authenticationType() === 'BasicAuth');
  protected readonly showsBearerToken = computed(() => this.authenticationType() === 'BearerToken');
  protected readonly showsOAuthSettings = computed(() => this.authenticationType() === 'OAuth2');
  protected readonly showsNoCredentials = computed(() => this.authenticationType() === 'None');

  /** Drives the compact capability row's `@for` loop — keeps the template from hand-listing the same
   * five near-identical blocks twice (locked-read-only vs. editable-checkbox). */
  protected readonly capabilityFields: ReadonlyArray<{
    control: 'supportsInventorySync' | 'supportsPriceSync' | 'supportsReservations' | 'supportsOrderStatus' | 'supportsWebhooks';
    labelKey: string;
  }> = [
    { control: 'supportsInventorySync', labelKey: 'ADMIN.SUPPLIERS.DETAIL.SUPPORTS_INVENTORY_SYNC' },
    { control: 'supportsPriceSync', labelKey: 'ADMIN.SUPPLIERS.DETAIL.SUPPORTS_PRICE_SYNC' },
    { control: 'supportsReservations', labelKey: 'ADMIN.SUPPLIERS.DETAIL.SUPPORTS_RESERVATIONS' },
    { control: 'supportsOrderStatus', labelKey: 'ADMIN.SUPPLIERS.DETAIL.SUPPORTS_ORDER_STATUS' },
    { control: 'supportsWebhooks', labelKey: 'ADMIN.SUPPLIERS.DETAIL.SUPPORTS_WEBHOOKS' },
  ];

  protected readonly settingsJsonError = signal<string | null>(null);
  protected readonly advancedConfigCollapsed = signal(true);

  /** Compact "masked credentials" read view vs. an open edit form — defaults to the compact view once
   * something is already stored, and to the open form when there's nothing to show yet (a brand-new
   * supplier shouldn't require an extra click just to enter its first credential). */
  protected readonly hasStoredCredentials = computed(() => {
    const d = this.detail();
    return !!(d?.hasApiKey || d?.hasApiSecret || d?.hasBearerToken || d?.hasOAuthSettings);
  });
  private readonly credentialsEditingOverride = signal<boolean | null>(null);
  protected readonly credentialsEditing = computed(() => this.credentialsEditingOverride() ?? !this.hasStoredCredentials());

  /** Connection status shown in the header/Connection section — ephemeral (this session's `testResult`
   * only, cleared on every `loadDetail`); there's no persisted "last connection health" field on the
   * backend to reflect here, so an untested supplier honestly reads "Not tested" rather than a guess. */
  protected readonly testedAt = signal<Date | null>(null);
  protected readonly connectionTone = computed<'neutral' | 'success' | 'danger'>(() => {
    const result = this.testResult();
    if (!result) {
      return 'neutral';
    }
    return result.isSuccess ? 'success' : 'danger';
  });
  protected readonly connectionLabel = computed(() => {
    const result = this.testResult();
    if (!result) {
      return 'ADMIN.SUPPLIERS.DETAIL.NOT_TESTED';
    }
    return result.isSuccess ? 'ADMIN.SUPPLIERS.DETAIL.CONNECTED' : 'ADMIN.SUPPLIERS.DETAIL.CONNECTION_ISSUE';
  });

  /** A derived, honest read on "are this supplier's mapped products actually available right now" —
   * computed from the same real availability counts shown in the stat cards, never a separate fabricated
   * status field. Neutral until at least one availability check has ever run. */
  protected readonly catalogStatusTone = computed<'neutral' | 'success' | 'warning'>(() => {
    const summary = this.availabilitySummary();
    if (!summary || summary.availableCount + summary.unavailableCount + summary.unknownCount === 0) {
      return 'neutral';
    }
    return summary.unavailableCount === 0 && summary.unknownCount === 0 ? 'success' : 'warning';
  });
  protected readonly catalogStatusLabel = computed(() => {
    switch (this.catalogStatusTone()) {
      case 'success':
        return 'ADMIN.SUPPLIERS.DETAIL.CATALOG_STATUS_HEALTHY';
      case 'warning':
        return 'ADMIN.SUPPLIERS.DETAIL.CATALOG_STATUS_ATTENTION';
      default:
        return 'ADMIN.SUPPLIERS.DETAIL.CATALOG_STATUS_UNKNOWN';
    }
  });

  protected readonly deleteDialogOpen = signal(false);
  protected readonly unsavedDialogOpen = signal(false);
  private unsavedDialogResolver: ((action: 'save' | 'discard' | 'cancel') => void) | null = null;

  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      { label: this.translate.instant('ADMIN.SUPPLIERS.LIST.TITLE'), route: '/admin/suppliers' },
      { label: this.isCreateMode() ? this.translate.instant('ADMIN.SUPPLIERS.DETAIL.NEW') : (this.detail()?.name ?? '') },
    ),
  );

  constructor() {
    // Keeps the form honest for providers with a fixed, backend-enforced endpoint and a
    // known-correct auth mechanism: an admin can't accidentally repoint Bamboo's Base URL or pick an
    // authentication type that would make `Supplier.HasCredentialsConfigured` check the wrong fields.
    // Runs for both create and edit — not just on providerType *change* — so it also applies right
    // after `patchForm()` loads an existing Bamboo supplier.
    effect(() => {
      const fixedUrl = this.fixedBaseUrl();
      const baseUrlControl = this.form.controls.baseUrl;
      if (fixedUrl) {
        if (baseUrlControl.value !== fixedUrl) {
          baseUrlControl.setValue(fixedUrl, { emitEvent: false });
        }
        baseUrlControl.disable({ emitEvent: false });
      } else {
        baseUrlControl.enable({ emitEvent: false });
      }

      // Visoria authenticates with a Bearer token no matter what's selected here (VisoriaHttpClient
      // always reads credentials.BearerToken) — locking this prevents an admin from picking e.g. ApiKey
      // auth for Visoria and ending up unable to configure the token the integration actually needs.
      const authTypeControl = this.form.controls.authenticationType;
      if (this.isBambooProvider()) {
        if (authTypeControl.value !== 'BasicAuth') {
          authTypeControl.setValue('BasicAuth', { emitEvent: false });
        }
        authTypeControl.disable({ emitEvent: false });
      } else if (this.isVisoriaProvider()) {
        if (authTypeControl.value !== 'BearerToken') {
          authTypeControl.setValue('BearerToken', { emitEvent: false });
        }
        authTypeControl.disable({ emitEvent: false });
      } else if (this.isGlobeTopperProvider()) {
        // GlobeTopperSupplierProvider always reads credentials.ApiKey/ApiSecret (GlobeTopper's key/secret
        // pair, combined into its documented `Bearer {key}:{secret}` header) — the same paired-value shape
        // ApiKey auth already means for this admin UI, so no new auth type was introduced.
        if (authTypeControl.value !== 'ApiKey') {
          authTypeControl.setValue('ApiKey', { emitEvent: false });
        }
        authTypeControl.disable({ emitEvent: false });
      } else if (this.isEnebaProvider()) {
        // EnebaSupplierProvider always reads credentials.OAuthSettingsJson — the first provider to
        // actually use OAuth2 (Auth ID/Auth Secret via client-credentials, plus the account email needed
        // to decrypt the key-export archive). See ADMIN.SUPPLIERS.DETAIL.OAUTH_SETTINGS_ENEBA_HINT for the
        // exact JSON shape expected.
        if (authTypeControl.value !== 'OAuth2') {
          authTypeControl.setValue('OAuth2', { emitEvent: false });
        }
        authTypeControl.disable({ emitEvent: false });
      } else if (this.isCodesWholesaleProvider()) {
        // CodesWholesaleSupplierProvider always reads credentials.ApiKey/ApiSecret (CodesWholesale's
        // Client ID/Client Secret pair) — even though CodesWholesale's own auth mechanism is OAuth2
        // client-credentials, the existing ApiKey credential shape already represents "two paired
        // secrets" one-to-one, so no new OAuthSettingsJson blob was introduced for what is, for this
        // provider, just two plain values.
        if (authTypeControl.value !== 'ApiKey') {
          authTypeControl.setValue('ApiKey', { emitEvent: false });
        }
        authTypeControl.disable({ emitEvent: false });
      } else {
        authTypeControl.enable({ emitEvent: false });
      }

      // Verified capabilities today for both locked providers: purchase + order status only (see
      // BambooSupplierProvider/VisoriaSupplierProvider — SyncProductsAsync/SyncInventoryAsync/
      // SyncPricesAsync/ReserveAsync are all honest "not implemented" stubs on both). Locking these
      // prevents an admin from configuring a capability the integration doesn't actually have.
      const unsupportedForLockedProviders = [
        this.form.controls.supportsInventorySync,
        this.form.controls.supportsPriceSync,
        this.form.controls.supportsReservations,
        this.form.controls.supportsWebhooks,
      ];
      for (const control of unsupportedForLockedProviders) {
        if (this.hasLockedCapabilities()) {
          control.setValue(false, { emitEvent: false });
          control.disable({ emitEvent: false });
        } else {
          control.enable({ emitEvent: false });
        }
      }

      // Order status IS verified/working for both — default it on for a brand-new supplier of either
      // type (never overrides an admin's own choice on an existing one, since `pristine` only holds true
      // before the first edit).
      const orderStatusControl = this.form.controls.supportsOrderStatus;
      if (this.hasLockedCapabilities() && this.isCreateMode() && orderStatusControl.pristine) {
        orderStatusControl.setValue(true, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    void this.facade.loadProviderTypes();

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.supplierId.set(id);
    void this.facade.loadDetail(id).then(() => this.patchForm());
    void this.facade.loadAvailabilitySummary(id);
    void this.facade.loadMappingCandidatesSummary(id);
  }

  protected readonly availabilitySummary = this.facade.availabilitySummary;
  protected readonly availabilitySummaryLoading = this.facade.availabilitySummaryLoading;
  protected readonly availabilitySyncing = this.facade.availabilitySyncing;
  protected readonly candidatesSummary = this.facade.candidatesSummary;
  protected readonly candidatesSummaryLoading = this.facade.candidatesSummaryLoading;

  protected async syncAvailabilityNow(): Promise<void> {
    const id = this.supplierId();
    if (!id) {
      return;
    }

    const result = await this.facade.syncAvailabilityNow(id);
    this.messageService.add({
      severity: result?.isSuccess ? 'success' : 'warn',
      summary: this.translate.instant(
        result?.isSuccess ? 'ADMIN.SUPPLIERS.AVAILABILITY.SYNC_SUCCESS' : 'ADMIN.SUPPLIERS.AVAILABILITY.SYNC_FAILED',
      ),
      detail: result?.message ?? '',
      life: 4000,
    });
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || !this.validateSettingsJson()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const id = this.supplierId();

    if (this.isCreateMode()) {
      const createdId = await this.facade.createSupplier({
        name: value.name,
        code: value.code,
        providerType: value.providerType,
        authenticationType: value.authenticationType,
        baseUrl: value.baseUrl.trim() ? value.baseUrl : null,
        priority: value.priority,
        supportsInventorySync: value.supportsInventorySync,
        supportsPriceSync: value.supportsPriceSync,
        supportsReservations: value.supportsReservations,
        supportsOrderStatus: value.supportsOrderStatus,
        supportsWebhooks: value.supportsWebhooks,
      });

      if (createdId) {
        // Settings (Bamboo's Account ID, CodesWholesale's Environment) can only be persisted via the
        // id-keyed settings endpoint, so a brand-new supplier of either kind needs this one extra call
        // right after creation — still all part of the same submit action, before the admin ever sees the
        // detail page (no manual refresh needed).
        const settingsSaved = this.isBambooProvider() || this.isCodesWholesaleProvider()
          ? await this.saveSettingsIfChanged(createdId, this.currentSettingsJsonValue())
          : true;

        this.form.markAsPristine();
        this.messageService.add(
          settingsSaved
            ? { severity: 'success', summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.CREATED'), life: 4000 }
            : {
                severity: 'warn',
                summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.CREATED'),
                detail: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.ACCOUNT_ID_SAVE_FAILED'),
                life: 6000,
              },
        );
        void this.router.navigate(['/admin/suppliers', createdId]);
        return;
      }

      this.showSaveError();
      return;
    }

    if (!id) {
      return;
    }

    const success = await this.facade.updateSupplier(id, {
      name: value.name,
      providerType: value.providerType,
      authenticationType: value.authenticationType,
      baseUrl: value.baseUrl.trim() ? value.baseUrl : null,
      supportsInventorySync: value.supportsInventorySync,
      supportsPriceSync: value.supportsPriceSync,
      supportsReservations: value.supportsReservations,
      supportsOrderStatus: value.supportsOrderStatus,
      supportsWebhooks: value.supportsWebhooks,
    });

    if (success) {
      await this.saveSettingsIfChanged(id, this.currentSettingsJsonValue());
      this.form.markAsPristine();
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.SAVED'),
        life: 4000,
      });
      return;
    }

    this.showSaveError();
  }

  protected async saveCredentials(): Promise<void> {
    const id = this.supplierId();
    if (!id) {
      return;
    }

    const value = this.credentialsForm.getRawValue();
    const success = await this.facade.updateCredentials(id, {
      apiKey: value.apiKey.trim() ? value.apiKey : null,
      apiSecret: value.apiSecret.trim() ? value.apiSecret : null,
      username: value.username.trim() ? value.username : null,
      password: value.password.trim() ? value.password : null,
      bearerToken: value.bearerToken.trim() ? value.bearerToken : null,
      oAuthSettingsJson: value.oAuthSettingsJson.trim() ? value.oAuthSettingsJson : null,
    });

    if (success) {
      this.credentialsForm.reset({ apiKey: '', apiSecret: '', username: '', password: '', bearerToken: '', oAuthSettingsJson: '' });
      this.credentialsEditingOverride.set(false);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.CREDENTIALS_SAVED'),
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.ACTION_FAILED'),
      detail: this.facade.detailError() ?? '',
      life: 5000,
    });
  }

  protected startEditCredentials(): void {
    this.credentialsEditingOverride.set(true);
  }

  protected cancelEditCredentials(): void {
    this.credentialsForm.reset({ apiKey: '', apiSecret: '', username: '', password: '', bearerToken: '', oAuthSettingsJson: '' });
    this.credentialsEditingOverride.set(false);
  }

  protected async testConnection(): Promise<void> {
    const id = this.supplierId();
    if (id) {
      await this.facade.testConnection(id);
      this.testedAt.set(new Date());
    }
  }

  /** Overflow menu behind the header's "More actions" trigger — Enable/Disable and Delete, so these
   * lifecycle actions no longer compete visually with the primary Map Products workflow. Mirrors
   * `ThemeDetailPageComponent.overflowMenuItems`'s identical permission-gated-array pattern. */
  protected overflowMenuItems(): MenuItem[] {
    const detail = this.detail();
    if (!detail) {
      return [];
    }

    const items: MenuItem[] = [];
    const t = (key: string) => this.translate.instant(key);

    // Also reachable via the always-visible secondary button on wider screens (hidden below 640px, see
    // the stylesheet) — included here unconditionally so mobile's collapsed single-menu header still
    // reaches every action, per the "collapse header actions into one menu on mobile" requirement.
    items.push({
      label: t('ADMIN.SUPPLIERS.ACTIONS.MAPPINGS'),
      icon: 'pi pi-sitemap',
      routerLink: ['/admin/suppliers', detail.id, 'mappings'],
    });

    if (this.permissionService.hasPermission(this.permissions.Suppliers.Edit)) {
      items.push({
        label: t(detail.isEnabled ? 'ADMIN.SUPPLIERS.ACTIONS.DISABLE' : 'ADMIN.SUPPLIERS.ACTIONS.ENABLE'),
        icon: detail.isEnabled ? 'pi pi-ban' : 'pi pi-check-circle',
        disabled: this.actionLoading(),
        command: () => void this.toggleEnabled(),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Suppliers.Delete)) {
      items.push({
        label: t('ADMIN.SUPPLIERS.ACTIONS.DELETE'),
        icon: 'pi pi-trash',
        disabled: this.actionLoading(),
        command: () => this.requestDelete(),
      });
    }

    return items;
  }

  protected async toggleEnabled(): Promise<void> {
    const id = this.supplierId();
    const detail = this.detail();
    if (!id || !detail) {
      return;
    }

    const success = detail.isEnabled ? await this.facade.disableSupplier(id) : await this.facade.enableSupplier(id);
    if (!success) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.ACTION_FAILED'),
        detail: this.facade.detailError() ?? '',
        life: 5000,
      });
    }
  }

  protected requestDelete(): void {
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const id = this.supplierId();
    if (!id) {
      return;
    }

    const success = await this.facade.deleteSupplier(id);
    if (success) {
      this.deleteDialogOpen.set(false);
      void this.router.navigate(['/admin/suppliers']);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.ACTION_FAILED'),
      life: 5000,
    });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

  promptUnsavedChanges(): Promise<'save' | 'discard' | 'cancel'> {
    return new Promise((resolve) => {
      this.unsavedDialogResolver = resolve;
      this.unsavedDialogOpen.set(true);
    });
  }

  protected onUnsavedDialogVisibleChange(visible: boolean): void {
    this.unsavedDialogOpen.set(visible);
    if (!visible && this.unsavedDialogResolver) {
      this.resolveUnsavedDialog('cancel');
    }
  }

  protected async onUnsavedSave(): Promise<void> {
    await this.save();
    this.resolveUnsavedDialog(this.form.pristine ? 'save' : 'cancel');
  }

  protected onUnsavedDiscard(): void {
    this.resolveUnsavedDialog('discard');
  }

  protected validateSettingsJson(): boolean {
    // The Bamboo Account ID field is rendered in both create and edit mode (see the template), and
    // `save()` persists it via the id-keyed settings endpoint right after a successful create — so the
    // requirement applies in both modes identically. The number input's own [min]="1" plus
    // Validators.min(1) already block a non-positive value; this only rejects "field left empty" —
    // Bamboo purchases fail closed without an account id.
    if (this.isBambooProvider()) {
      const valid = this.bambooAccountIdControl.value !== null && this.bambooAccountIdControl.value > 0;
      this.settingsJsonError.set(valid ? null : this.translate.instant('ADMIN.SUPPLIERS.DETAIL.ACCOUNT_ID_REQUIRED'));
      return valid;
    }

    // codesWholesaleEnvironmentControl is a non-nullable select defaulting to "Sandbox" — always valid,
    // nothing to reject here.
    if (this.isCodesWholesaleProvider()) {
      this.settingsJsonError.set(null);
      return true;
    }

    const raw = this.form.controls.settingsJson.value;
    if (!raw.trim()) {
      this.settingsJsonError.set(null);
      return true;
    }

    try {
      JSON.parse(raw);
      this.settingsJsonError.set(null);
      return true;
    } catch {
      this.settingsJsonError.set(this.translate.instant('ADMIN.SUPPLIERS.DETAIL.INVALID_JSON'));
      return false;
    }
  }

  /** Bamboo/CodesWholesale each serialize their friendlier dedicated field back into the generic `settingsJson` shape the backend actually stores and validates; every other provider passes its raw textarea value straight through. */
  private currentSettingsJsonValue(): string {
    if (this.isBambooProvider()) {
      const accountId = this.bambooAccountIdControl.value;
      return accountId ? JSON.stringify({ accountId }) : '';
    }

    if (this.isCodesWholesaleProvider()) {
      return JSON.stringify({ environment: this.codesWholesaleEnvironmentControl.value });
    }

    return this.form.controls.settingsJson.value;
  }

  /** Returns true when nothing needed saving, or the save succeeded; false only when an actual save attempt failed. */
  private async saveSettingsIfChanged(id: string, settingsJson: string): Promise<boolean> {
    const current = this.detail()?.settingsJson ?? '';
    if (settingsJson === current) {
      return true;
    }

    return this.facade.updateSettings(id, { settingsJson: settingsJson.trim() ? settingsJson : null });
  }

  private patchForm(): void {
    const detail = this.detail();
    if (!detail) {
      return;
    }

    this.form.reset({
      name: detail.name,
      code: detail.code,
      providerType: detail.providerType,
      authenticationType: detail.authenticationType,
      baseUrl: detail.baseUrl ?? '',
      priority: detail.priority,
      supportsInventorySync: detail.supportsInventorySync,
      supportsPriceSync: detail.supportsPriceSync,
      supportsReservations: detail.supportsReservations,
      supportsOrderStatus: detail.supportsOrderStatus,
      supportsWebhooks: detail.supportsWebhooks,
      settingsJson: detail.settingsJson ?? '',
    });
    this.form.controls.code.disable();

    this.bambooAccountIdControl.setValue(this.parseBambooAccountId(detail.settingsJson));
    this.codesWholesaleEnvironmentControl.setValue(this.parseCodesWholesaleEnvironment(detail.settingsJson));
  }

  private parseCodesWholesaleEnvironment(settingsJson: string | null): 'Sandbox' | 'Production' {
    if (!settingsJson) {
      return 'Sandbox';
    }

    try {
      const parsed: unknown = JSON.parse(settingsJson);
      const environment = (parsed as { environment?: unknown } | null)?.environment;
      return environment === 'Production' ? 'Production' : 'Sandbox';
    } catch {
      return 'Sandbox';
    }
  }

  private parseBambooAccountId(settingsJson: string | null): number | null {
    if (!settingsJson) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(settingsJson);
      const accountId = (parsed as { accountId?: unknown } | null)?.accountId;
      return typeof accountId === 'number' && accountId > 0 ? accountId : null;
    } catch {
      return null;
    }
  }

  private resolveUnsavedDialog(action: 'save' | 'discard' | 'cancel'): void {
    this.unsavedDialogOpen.set(false);
    this.unsavedDialogResolver?.(action);
    this.unsavedDialogResolver = null;
  }

  private showSaveError(): void {
    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.SAVE_FAILED'),
      detail: this.facade.detailError() ?? '',
      life: 5000,
    });
  }
}
