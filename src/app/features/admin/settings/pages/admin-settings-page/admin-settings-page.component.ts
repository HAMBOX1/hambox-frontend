import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { HasUnsavedChanges } from '../../../../../core/guards/unsaved-changes.guard';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminConfirmDialogComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminSectionCardComponent,
  AdminStickySaveBarComponent,
  AdminUnsavedChangesDialogComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { RoleManagementFacade } from '../../../roles/services/role-management.facade';
import { ThemeManagementFacade } from '../../../themes/services/theme-management.facade';
import {
  ADVANCED_CATEGORY_KEYS,
  CURRENCY_OPTIONS,
  HIDDEN_CATEGORY_KEYS,
  PlatformSettingsCategoryDto,
  SETTINGS_FIELD_CONFIGS,
  SettingsFieldConfig,
  SettingsFieldOption,
  validateFieldValue,
} from '../../models/platform-settings.model';
import { PlatformSettingsFacade } from '../../services/platform-settings.facade';
import { StorefrontSettingsEditorComponent } from '../../components/storefront-settings-editor/storefront-settings-editor.component';
import { SettingsFieldComponent } from '../../components/settings-field/settings-field.component';

interface SettingsNavSection {
  label: string;
  items: PlatformSettingsCategoryDto[];
}

/** The backend returns nav group names as literal English display text (PlatformSettingsCategoryMetadata.cs), not i18n keys — mapped to real translation keys here so the nav header localizes into Arabic instead of always showing the raw English string. */
const GROUP_LABEL_KEYS: Record<string, string> = {
  Platform: 'ADMIN.SETTINGS.NAV.GROUP_PLATFORM',
  Communications: 'ADMIN.SETTINGS.NAV.GROUP_COMMUNICATIONS',
  Security: 'ADMIN.SETTINGS.NAV.GROUP_SECURITY',
  Commerce: 'ADMIN.SETTINGS.NAV.GROUP_COMMERCE',
  Operations: 'ADMIN.SETTINGS.NAV.GROUP_OPERATIONS',
  Content: 'ADMIN.SETTINGS.NAV.GROUP_CONTENT',
};

/** Same problem as GROUP_LABEL_KEYS, but for each category's own display name (used in the nav list and as the section-card title) — PlatformSettingsCategoryMetadata.cs only provides an English label. */
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  general: 'ADMIN.SETTINGS.NAV.CATEGORY_GENERAL',
  branding: 'ADMIN.SETTINGS.NAV.CATEGORY_BRANDING',
  storefront: 'ADMIN.SETTINGS.NAV.CATEGORY_STOREFRONT',
  localization: 'ADMIN.SETTINGS.NAV.CATEGORY_LOCALIZATION',
  currency: 'ADMIN.SETTINGS.NAV.CATEGORY_CURRENCY',
  theme: 'ADMIN.SETTINGS.NAV.CATEGORY_THEME',
  email: 'ADMIN.SETTINGS.NAV.CATEGORY_EMAIL',
  authentication: 'ADMIN.SETTINGS.NAV.CATEGORY_AUTHENTICATION',
  security: 'ADMIN.SETTINGS.NAV.CATEGORY_SECURITY',
  otp: 'ADMIN.SETTINGS.NAV.CATEGORY_OTP',
  totp: 'ADMIN.SETTINGS.NAV.CATEGORY_TOTP',
  commerce: 'ADMIN.SETTINGS.NAV.CATEGORY_COMMERCE',
  checkout: 'ADMIN.SETTINGS.NAV.CATEGORY_CHECKOUT',
  promotions: 'ADMIN.SETTINGS.NAV.CATEGORY_PROMOTIONS',
  memberships: 'ADMIN.SETTINGS.NAV.CATEGORY_MEMBERSHIPS',
  referral: 'ADMIN.SETTINGS.NAV.CATEGORY_REFERRAL',
  inventory: 'ADMIN.SETTINGS.NAV.CATEGORY_INVENTORY',
  queue: 'ADMIN.SETTINGS.NAV.CATEGORY_QUEUE',
  retryPolicies: 'ADMIN.SETTINGS.NAV.CATEGORY_RETRY_POLICIES',
  notifications: 'ADMIN.SETTINGS.NAV.CATEGORY_NOTIFICATIONS',
  media: 'ADMIN.SETTINGS.NAV.CATEGORY_MEDIA',
  seo: 'ADMIN.SETTINGS.NAV.CATEGORY_SEO',
  analytics: 'ADMIN.SETTINGS.NAV.CATEGORY_ANALYTICS',
  integrations: 'ADMIN.SETTINGS.NAV.CATEGORY_INTEGRATIONS',
  maintenance: 'ADMIN.SETTINGS.NAV.CATEGORY_MAINTENANCE',
  legal: 'ADMIN.SETTINGS.NAV.CATEGORY_LEGAL',
};

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    TranslatePipe,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminSearchBarComponent,
    AdminSectionCardComponent,
    AdminLoadingSkeletonComponent,
    AdminStickySaveBarComponent,
    AdminConfirmDialogComponent,
    AdminUnsavedChangesDialogComponent,
    StorefrontSettingsEditorComponent,
    SettingsFieldComponent,
  ],
  providers: [PlatformSettingsFacade, RoleManagementFacade, ThemeManagementFacade, MessageService],
  templateUrl: './admin-settings-page.component.html',
  styleUrl: './admin-settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsPageComponent implements OnInit, HasUnsavedChanges {
  protected readonly facade = inject(PlatformSettingsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly rolesFacade = inject(RoleManagementFacade);
  private readonly themesFacade = inject(ThemeManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly permissionService = inject(PermissionService);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;
  protected readonly fieldConfigs = SETTINGS_FIELD_CONFIGS;
  protected readonly currencyOptions = CURRENCY_OPTIONS;
  protected readonly advancedSectionLabel = 'ADMIN.SETTINGS.NAV.ADVANCED';

  protected readonly searchTerm = signal('');
  protected readonly activeCategoryKey = signal('general');
  protected readonly draftPayload = signal<Record<string, unknown>>({});
  protected readonly savedSnapshot = signal('');
  protected readonly testEmail = signal('');
  protected readonly advancedNavExpanded = signal(false);
  protected readonly advancedFieldsCollapsed = signal(true);
  protected readonly newRateCurrency = signal<string | null>(null);
  protected readonly newRateValue = signal<number | null>(null);

  protected readonly unsavedDialogOpen = signal(false);
  protected readonly restoreDialogOpen = signal(false);
  protected readonly pendingCategory = signal<PlatformSettingsCategoryDto | null>(null);
  private unsavedDialogResolver: ((action: 'save' | 'discard' | 'cancel') => void) | null = null;

  protected readonly dangerousConfirmOpen = signal(false);
  private pendingDangerousField: { key: string; previousValue: unknown } | null = null;

  protected readonly canEdit = computed(() =>
    this.permissionService.hasPermission(PERMISSIONS.Settings.Edit),
  );

  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'ADMIN.SETTINGS.BREADCRUMB' });

  /** Backend still returns these category rows (default payloads exist), but nothing reads
   * them — filtered out here rather than in the nav computed so every "pick a category" path
   * (nav list, default-on-load, deep link) shares one source of truth. */
  protected readonly visibleCategories = computed(() =>
    this.facade.categories().filter((c) => !HIDDEN_CATEGORY_KEYS.includes(c.key)),
  );

  protected readonly roleOptions = computed<SettingsFieldOption[]>(() =>
    this.rolesFacade.roles().map((role) => ({ label: role.name, value: role.name })),
  );

  protected readonly themeOptions = computed<SettingsFieldOption[]>(() =>
    this.themesFacade.themes().map((theme) => ({ label: theme.name, value: theme.id })),
  );

  /** Substring match against the category itself, or against any of its fields' translated labels — so "sender" (an Email field) surfaces the Email category, not just "email" itself. */
  protected readonly navSections = computed<SettingsNavSection[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const items = this.visibleCategories();

    const matches = (category: PlatformSettingsCategoryDto): boolean => {
      if (!term) {
        return true;
      }
      if (
        category.label.toLowerCase().includes(term) ||
        category.group.toLowerCase().includes(term) ||
        category.key.toLowerCase().includes(term)
      ) {
        return true;
      }
      const fields = this.fieldConfigs[category.key] ?? [];
      return fields.some((field) => this.translate.instant(field.labelKey).toLowerCase().includes(term));
    };

    const standard = items.filter((c) => !ADVANCED_CATEGORY_KEYS.includes(c.key) && matches(c));
    const advanced = items.filter((c) => ADVANCED_CATEGORY_KEYS.includes(c.key) && matches(c));

    const groups = new Map<string, PlatformSettingsCategoryDto[]>();
    for (const category of standard) {
      const list = groups.get(category.group) ?? [];
      list.push(category);
      groups.set(category.group, list);
    }

    const sections: SettingsNavSection[] = Array.from(groups.entries()).map(([label, categoryItems]) => ({
      label: GROUP_LABEL_KEYS[label] ?? label,
      items: categoryItems,
    }));

    if (advanced.length) {
      sections.push({ label: this.advancedSectionLabel, items: advanced });
    }

    return sections;
  });

  protected readonly showAdvancedNav = computed(
    () =>
      this.advancedNavExpanded() ||
      this.searchTerm().trim().length > 0 ||
      ADVANCED_CATEGORY_KEYS.includes(this.activeCategoryKey()),
  );

  protected readonly activeCategory = computed(() =>
    this.facade.categories().find((item) => item.key === this.activeCategoryKey()) ?? null,
  );

  protected readonly activeFields = computed<SettingsFieldConfig[]>(() => {
    const key = this.activeCategoryKey();
    return this.fieldConfigs[key] ?? [];
  });

  protected readonly primaryFields = computed(() => this.activeFields().filter((f) => !f.advanced));
  protected readonly advancedFields = computed(() => this.activeFields().filter((f) => f.advanced));

  protected readonly fieldErrors = computed<Record<string, string | null>>(() => {
    const payload = this.draftPayload();
    const errors: Record<string, string | null> = {};
    for (const field of this.activeFields()) {
      errors[field.key] = validateFieldValue(field, payload[field.key]);
    }
    return errors;
  });

  protected readonly hasValidationErrors = computed(() =>
    Object.values(this.fieldErrors()).some((error) => !!error),
  );

  protected readonly dirty = computed(
    () => this.savedSnapshot() !== JSON.stringify(this.draftPayload()),
  );

  protected readonly isStorefrontCategory = computed(
    () => this.activeCategoryKey() === 'storefront',
  );
  protected readonly isCurrencyCategory = computed(() => this.activeCategoryKey() === 'currency');

  protected readonly rateEntries = computed(() => {
    const rates = this.draftPayload()['staticRates'];
    return rates && typeof rates === 'object' ? Object.entries(rates as Record<string, number>) : [];
  });

  protected readonly availableRateCurrencies = computed(() => {
    const used = new Set(this.rateEntries().map(([code]) => code));
    return this.currencyOptions.filter((option) => !used.has(option.value));
  });

  async ngOnInit(): Promise<void> {
    await this.facade.load();
    await this.facade.loadAudit();
    this.rolesFacade.loadRoles();
    this.themesFacade.loadThemes();

    // Supports deep links like /admin/settings?category=referral (e.g. the "Go to Platform
    // Settings" shortcut on a Referral Reward promotion) — falls back to the first category.
    const requestedKey = this.route.snapshot.queryParamMap.get('category');
    const requested = requestedKey
      ? this.visibleCategories().find((c) => c.key === requestedKey)
      : undefined;
    const first = requested ?? this.visibleCategories()[0];
    if (first) {
      this.applyCategory(first);
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) {
      event.preventDefault();
    }
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  promptUnsavedChanges(): Promise<'save' | 'discard' | 'cancel'> {
    return new Promise((resolve) => {
      this.unsavedDialogResolver = resolve;
      this.unsavedDialogOpen.set(true);
    });
  }

  protected selectCategory(category: PlatformSettingsCategoryDto): void {
    if (category.key === this.activeCategoryKey()) {
      return;
    }

    if (this.dirty()) {
      this.pendingCategory.set(category);
      void this.promptUnsavedChanges().then((action) => {
        if (action === 'save') {
          void this.saveActive().then((saved) => {
            if (saved) {
              this.applyCategory(category);
            }
          });
        } else if (action === 'discard') {
          this.applyCategory(category);
        }
        this.pendingCategory.set(null);
      });
      return;
    }

    this.applyCategory(category);
  }

  protected setField(field: SettingsFieldConfig, value: unknown): void {
    if (field.dangerous) {
      this.pendingDangerousField = { key: field.key, previousValue: this.draftPayload()[field.key] };
      this.draftPayload.update((current) => ({ ...current, [field.key]: value }));
      this.dangerousConfirmOpen.set(true);
      return;
    }
    this.draftPayload.update((current) => ({ ...current, [field.key]: value }));
  }

  protected confirmDangerousChange(): void {
    this.dangerousConfirmOpen.set(false);
    this.pendingDangerousField = null;
  }

  protected onDangerousDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.cancelDangerousChange();
    }
  }

  protected cancelDangerousChange(): void {
    this.dangerousConfirmOpen.set(false);
    const pending = this.pendingDangerousField;
    if (pending) {
      this.draftPayload.update((current) => ({ ...current, [pending.key]: pending.previousValue }));
    }
    this.pendingDangerousField = null;
  }

  protected replaceDraft(payload: Record<string, unknown>): void {
    this.draftPayload.set(payload);
  }

  protected readField(key: string): unknown {
    return this.draftPayload()[key];
  }

  protected categoryLabelKey(category: PlatformSettingsCategoryDto): string {
    return CATEGORY_LABEL_KEYS[category.key] ?? category.label;
  }

  protected errorKeyFor(fieldKey: string): string | null {
    const code = this.fieldErrors()[fieldKey];
    return code ? `ADMIN.SETTINGS.VALIDATION.${code}` : null;
  }

  protected errorParamsFor(field: SettingsFieldConfig): Record<string, unknown> {
    return {
      min: field.validators?.min ?? field.min,
      max: field.validators?.max ?? field.max,
      minLength: field.validators?.minLength,
      maxLength: field.validators?.maxLength,
    };
  }

  protected resolvedOptionsFor(field: SettingsFieldConfig): SettingsFieldOption[] | null {
    if (field.options === 'roles') {
      return this.roleOptions();
    }
    if (field.options === 'themes') {
      return this.themeOptions();
    }
    return null;
  }

  protected setRate(code: string, value: number | null): void {
    this.draftPayload.update((current) => {
      const rates = { ...((current['staticRates'] as Record<string, number>) ?? {}) };
      rates[code] = value ?? 0;
      return { ...current, staticRates: rates };
    });
  }

  protected removeRate(code: string): void {
    this.draftPayload.update((current) => {
      const rates = { ...((current['staticRates'] as Record<string, number>) ?? {}) };
      delete rates[code];
      return { ...current, staticRates: rates };
    });
  }

  protected addRate(): void {
    const code = this.newRateCurrency();
    const value = this.newRateValue();
    if (!code || value === null) {
      return;
    }
    this.setRate(code, value);
    this.newRateCurrency.set(null);
    this.newRateValue.set(null);
  }

  protected async saveActive(): Promise<boolean> {
    if (!this.canEdit() || this.hasValidationErrors()) {
      return false;
    }

    const ok = await this.facade.saveCategory(this.activeCategoryKey(), this.draftPayload());
    if (ok) {
      this.savedSnapshot.set(JSON.stringify(this.draftPayload()));
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.SETTINGS.TOAST.SAVED_SUMMARY'),
        detail: this.translate.instant('ADMIN.SETTINGS.TOAST.SAVED_DETAIL', {
          category: this.activeCategory()?.label ?? '',
        }),
      });
      await this.facade.loadAudit();
    } else if (this.facade.error()) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.SETTINGS.TOAST.SAVE_FAILED_SUMMARY'),
        detail: this.facade.error() ?? '',
      });
    }
    return ok;
  }

  protected requestRestore(): void {
    if (!this.canEdit()) {
      return;
    }
    this.restoreDialogOpen.set(true);
  }

  protected async confirmRestore(): Promise<void> {
    this.restoreDialogOpen.set(false);
    const ok = await this.facade.restoreDefaults(this.activeCategoryKey());
    if (ok) {
      const updated = this.facade.categories().find((c) => c.key === this.activeCategoryKey());
      if (updated) {
        const payload = structuredClone(updated.payload) as Record<string, unknown>;
        this.draftPayload.set(payload);
        this.savedSnapshot.set(JSON.stringify(payload));
      }

      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('ADMIN.SETTINGS.TOAST.DEFAULTS_RESTORED'),
      });
      await this.facade.loadAudit();
    }
  }

  protected async onUnsavedSave(): Promise<void> {
    const saved = await this.saveActive();
    this.finishUnsavedDialog(saved ? 'save' : 'cancel');
  }

  protected onUnsavedDiscard(): void {
    const pending = this.pendingCategory();
    if (pending) {
      this.applyCategory(pending);
      this.pendingCategory.set(null);
    } else {
      const category = this.activeCategory();
      if (category) {
        const payload = structuredClone(category.payload) as Record<string, unknown>;
        this.draftPayload.set(payload);
        this.savedSnapshot.set(JSON.stringify(payload));
      }
    }
    this.finishUnsavedDialog('discard');
  }

  protected onUnsavedCancel(): void {
    this.pendingCategory.set(null);
    this.finishUnsavedDialog('cancel');
  }

  protected onUnsavedDialogVisibleChange(visible: boolean): void {
    this.unsavedDialogOpen.set(visible);
    if (!visible && this.unsavedDialogResolver) {
      this.onUnsavedCancel();
    }
  }

  protected async sendTestEmail(): Promise<void> {
    if (!this.canEdit() || !this.testEmail().trim()) {
      return;
    }

    const ok = await this.facade.testSmtp(this.testEmail().trim());
    if (ok) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.SETTINGS.TOAST.SMTP_TEST_SENT_SUMMARY'),
        detail: this.translate.instant('ADMIN.SETTINGS.TOAST.SMTP_TEST_SENT_DETAIL', {
          email: this.testEmail(),
        }),
      });
    }
  }

  private applyCategory(category: PlatformSettingsCategoryDto): void {
    this.activeCategoryKey.set(category.key);
    const payload = structuredClone(category.payload) as Record<string, unknown>;
    this.draftPayload.set(payload);
    this.savedSnapshot.set(JSON.stringify(payload));
  }

  private finishUnsavedDialog(action: 'save' | 'discard' | 'cancel'): void {
    this.unsavedDialogOpen.set(false);
    this.unsavedDialogResolver?.(action);
    this.unsavedDialogResolver = null;
  }
}
