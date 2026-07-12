import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TranslatePipe } from '@ngx-translate/core';

import { HasUnsavedChanges } from '../../../../../core/guards/unsaved-changes.guard';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminConfirmDialogComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStickySaveBarComponent,
  AdminUnsavedChangesDialogComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import {
  PlatformSettingsCategoryDto,
  SETTINGS_FIELD_CONFIGS,
  SettingsFieldConfig,
} from '../../models/platform-settings.model';
import { PlatformSettingsFacade } from '../../services/platform-settings.facade';
import { StorefrontSettingsEditorComponent } from '../../components/storefront-settings-editor/storefront-settings-editor.component';

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    TranslatePipe,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminSectionCardComponent,
    AdminLoadingSkeletonComponent,
    AdminStickySaveBarComponent,
    AdminConfirmDialogComponent,
    AdminUnsavedChangesDialogComponent,
    StorefrontSettingsEditorComponent,
  ],
  providers: [PlatformSettingsFacade, MessageService],
  templateUrl: './admin-settings-page.component.html',
  styleUrl: './admin-settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsPageComponent implements OnInit, HasUnsavedChanges {
  protected readonly facade = inject(PlatformSettingsFacade);
  private readonly messageService = inject(MessageService);
  private readonly permissionService = inject(PermissionService);

  protected readonly permissions = PERMISSIONS;
  protected readonly fieldConfigs = SETTINGS_FIELD_CONFIGS;

  protected readonly searchTerm = signal('');
  protected readonly activeCategoryKey = signal('general');
  protected readonly draftPayload = signal<Record<string, unknown>>({});
  protected readonly savedSnapshot = signal('');
  protected readonly testEmail = signal('');

  protected readonly unsavedDialogOpen = signal(false);
  protected readonly restoreDialogOpen = signal(false);
  protected readonly pendingCategory = signal<PlatformSettingsCategoryDto | null>(null);
  private unsavedDialogResolver: ((action: 'save' | 'discard' | 'cancel') => void) | null = null;

  protected readonly canEdit = computed(() =>
    this.permissionService.hasPermission(PERMISSIONS.Settings.Edit),
  );

  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Settings' });

  protected readonly filteredCategories = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const items = this.facade.categories();
    if (!term) {
      return items;
    }

    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        item.group.toLowerCase().includes(term) ||
        item.key.toLowerCase().includes(term),
    );
  });

  protected readonly activeCategory = computed(() =>
    this.facade.categories().find((item) => item.key === this.activeCategoryKey()) ?? null,
  );

  protected readonly activeFields = computed<SettingsFieldConfig[]>(() => {
    const key = this.activeCategoryKey();
    return this.fieldConfigs[key] ?? [];
  });

  protected readonly dirty = computed(
    () => this.savedSnapshot() !== JSON.stringify(this.draftPayload()),
  );

  protected readonly isStorefrontCategory = computed(
    () => this.activeCategoryKey() === 'storefront',
  );

  protected readonly brandingPreview = computed(() => {
    const payload = this.draftPayload();
    return {
      title: String(payload['browserTitle'] ?? 'HAMBOX'),
      primary: String(payload['primaryColor'] ?? '#6366f1'),
      secondary: String(payload['secondaryColor'] ?? '#0f172a'),
      accent: String(payload['accentColor'] ?? '#22d3ee'),
      logoUrl: payload['logoUrl'] ? String(payload['logoUrl']) : null,
    };
  });

  async ngOnInit(): Promise<void> {
    await this.facade.load();
    await this.facade.loadAudit();
    const first = this.facade.categories()[0];
    if (first) {
      this.applyCategory(first);
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

  protected setField(key: string, value: unknown): void {
    this.draftPayload.update((current) => ({ ...current, [key]: value }));
  }

  protected replaceDraft(payload: Record<string, unknown>): void {
    this.draftPayload.set(payload);
  }

  protected readField(key: string): unknown {
    return this.draftPayload()[key];
  }

  protected readBoolean(key: string): boolean {
    return Boolean(this.draftPayload()[key]);
  }

  protected readNumber(key: string): number | null {
    const value = this.draftPayload()[key];
    return typeof value === 'number' ? value : value == null ? null : Number(value);
  }

  protected readText(key: string): string {
    const value = this.draftPayload()[key];
    return value == null ? '' : String(value);
  }

  protected async saveActive(): Promise<boolean> {
    if (!this.canEdit()) {
      return false;
    }

    const ok = await this.facade.saveCategory(this.activeCategoryKey(), this.draftPayload());
    if (ok) {
      this.savedSnapshot.set(JSON.stringify(this.draftPayload()));
      this.messageService.add({
        severity: 'success',
        summary: 'Settings saved',
        detail: `${this.activeCategory()?.label ?? 'Category'} updated successfully.`,
      });
      await this.facade.loadAudit();
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
        summary: 'Defaults restored',
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
        summary: 'SMTP test sent',
        detail: `Test email sent to ${this.testEmail()}.`,
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
