import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { HasUnsavedChanges } from '../../../../../core/guards/unsaved-changes.guard';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStickySaveBarComponent,
  AdminUnsavedChangesDialogComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import {
  WHATSAPP_ACTION_LABEL_KEYS,
  WhatsAppBotConfigurationDto,
  WhatsAppMenuItemDto,
} from '../../models/whatsapp-bot-config.model';
import { WhatsAppBotConfigFacade } from '../../services/whatsapp-bot-config.facade';

/** The one Support control this page shows — see the class doc comment on why there is no separate
 * "WhatsApp support contact" field. */
const SUPPORT_ACTION = 'Support' as const;

@Component({
  selector: 'app-admin-whatsapp-page',
  standalone: true,
  imports: [
    FormsModule,
    DragDropModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ToggleSwitchModule,
    SelectButtonModule,
    ToastModule,
    TranslatePipe,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminSectionCardComponent,
    AdminStickySaveBarComponent,
    AdminUnsavedChangesDialogComponent,
  ],
  providers: [WhatsAppBotConfigFacade, MessageService],
  templateUrl: './admin-whatsapp-page.component.html',
  styleUrl: './admin-whatsapp-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Admin editor for the WhatsApp bot's presentation only — welcome/fallback text and the seven fixed
 * menu items' enabled state, order, and EN/AR labels. Never edits bot behavior: the seven actions are a
 * closed set (see WhatsAppMenuAction on the backend), there is no way to add, remove, or rename an
 * action's identity here, and disabling an item only removes it from the numbered menu — it does not
 * touch Orders/Alerts/Support authorization, which the bot engine still enforces exactly as before.
 *
 * "Support" section: the Support module has no separate "WhatsApp contact" setting to surface here —
 * WhatsApp-originated tickets use Support's own default ticket category. This section is a read-only
 * pointer to the Support row already editable in the Main Menu list below, not a second control.
 */
export class AdminWhatsAppPageComponent implements OnInit, HasUnsavedChanges {
  protected readonly facade = inject(WhatsAppBotConfigFacade);
  private readonly messageService = inject(MessageService);
  private readonly permissionService = inject(PermissionService);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;
  protected readonly actionLabelKeys = WHATSAPP_ACTION_LABEL_KEYS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'ADMIN.WHATSAPP.BREADCRUMB' });
  protected readonly previewLanguageOptions = [
    { label: 'EN', value: 'en' as const },
    { label: 'AR', value: 'ar' as const },
  ];

  protected readonly draftConfig = signal<WhatsAppBotConfigurationDto | null>(null);
  protected readonly savedSnapshot = signal('');
  protected readonly previewLanguage = signal<'en' | 'ar'>('en');
  protected readonly unsavedDialogOpen = signal(false);
  private unsavedDialogResolver: ((action: 'save' | 'discard' | 'cancel') => void) | null = null;

  protected readonly canEdit = computed(() =>
    this.permissionService.hasPermission(PERMISSIONS.WhatsAppBot.Edit),
  );

  protected readonly items = computed<WhatsAppMenuItemDto[]>(() => this.draftConfig()?.items ?? []);

  protected readonly supportItem = computed(() =>
    this.items().find((item) => item.action === SUPPORT_ACTION) ?? null,
  );

  protected readonly dirty = computed(() => this.savedSnapshot() !== JSON.stringify(this.draftConfig()));

  protected readonly atLeastOneEnabled = computed(() => this.items().some((item) => item.isEnabled));

  protected readonly allLabelsFilled = computed(() =>
    this.items().every((item) => item.labelEn.trim().length > 0 && item.labelAr.trim().length > 0),
  );

  protected readonly messagesFilled = computed(() => {
    const config = this.draftConfig();
    return !!(
      config?.welcomeMessageEn.trim() &&
      config?.welcomeMessageAr.trim() &&
      config?.fallbackMessageEn.trim() &&
      config?.fallbackMessageAr.trim()
    );
  });

  protected readonly hasValidationErrors = computed(
    () => !this.atLeastOneEnabled() || !this.allLabelsFilled() || !this.messagesFilled(),
  );

  /** Configuration-only preview of what the bot's Main menu would say — plain string formatting over
   * the current draft, no HTTP calls, never touches real carts/orders/alerts. Mirrors
   * WhatsAppBotEngine.RenderMain's text shape so what the admin sees here matches the real reply. */
  protected readonly previewText = computed(() => {
    const config = this.draftConfig();
    if (!config) {
      return '';
    }

    const lang = this.previewLanguage();
    const welcome = lang === 'ar' ? config.welcomeMessageAr : config.welcomeMessageEn;
    const enabled = this.items()
      .filter((item) => item.isEnabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const lines = enabled.map(
      (item, index) => `${index + 1}. ${lang === 'ar' ? item.labelAr : item.labelEn}`,
    );

    return [welcome, ...lines].join('\n');
  });

  async ngOnInit(): Promise<void> {
    await this.facade.load();
    const loaded = this.facade.config();
    if (loaded) {
      this.applyConfig(loaded);
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

  protected toggleItem(action: WhatsAppMenuItemDto['action'], isEnabled: boolean): void {
    this.updateDraft((config) => ({
      ...config,
      items: config.items.map((item) => (item.action === action ? { ...item, isEnabled } : item)),
    }));
  }

  protected setLabel(
    action: WhatsAppMenuItemDto['action'],
    field: 'labelEn' | 'labelAr',
    value: string,
  ): void {
    this.updateDraft((config) => ({
      ...config,
      items: config.items.map((item) => (item.action === action ? { ...item, [field]: value } : item)),
    }));
  }

  protected setWelcome(field: 'welcomeMessageEn' | 'welcomeMessageAr', value: string): void {
    this.updateDraft((config) => ({ ...config, [field]: value }));
  }

  protected setFallback(field: 'fallbackMessageEn' | 'fallbackMessageAr', value: string): void {
    this.updateDraft((config) => ({ ...config, [field]: value }));
  }

  protected onItemDrop(event: CdkDragDrop<WhatsAppMenuItemDto[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.updateDraft((config) => {
      const reordered = [...config.items].sort((a, b) => a.sortOrder - b.sortOrder);
      moveItemInArray(reordered, event.previousIndex, event.currentIndex);
      return {
        ...config,
        items: reordered.map((item, index) => ({ ...item, sortOrder: index })),
      };
    });
  }

  protected async save(): Promise<void> {
    const config = this.draftConfig();
    if (!this.canEdit() || !config || this.hasValidationErrors()) {
      return;
    }

    const ok = await this.facade.save(config);
    if (ok) {
      const saved = this.facade.config();
      if (saved) {
        this.applyConfig(saved);
      }
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.WHATSAPP.TOAST.SAVED_SUMMARY'),
        detail: this.translate.instant('ADMIN.WHATSAPP.TOAST.SAVED_DETAIL'),
      });
    } else if (this.facade.error()) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.WHATSAPP.TOAST.SAVE_FAILED_SUMMARY'),
        detail: this.facade.error() ?? '',
      });
    }
  }

  protected async onUnsavedSave(): Promise<void> {
    await this.save();
    this.finishUnsavedDialog(this.dirty() ? 'cancel' : 'save');
  }

  protected onUnsavedDiscard(): void {
    const saved = this.facade.config();
    if (saved) {
      this.applyConfig(saved);
    }
    this.finishUnsavedDialog('discard');
  }

  protected onUnsavedDialogVisibleChange(visible: boolean): void {
    this.unsavedDialogOpen.set(visible);
    if (!visible && this.unsavedDialogResolver) {
      this.finishUnsavedDialog('cancel');
    }
  }

  private updateDraft(mutate: (config: WhatsAppBotConfigurationDto) => WhatsAppBotConfigurationDto): void {
    const current = this.draftConfig();
    if (current) {
      this.draftConfig.set(mutate(current));
    }
  }

  private applyConfig(config: WhatsAppBotConfigurationDto): void {
    const cloned = structuredClone(config);
    this.draftConfig.set(cloned);
    this.savedSnapshot.set(JSON.stringify(cloned));
  }

  private finishUnsavedDialog(action: 'save' | 'discard' | 'cancel'): void {
    this.unsavedDialogOpen.set(false);
    this.unsavedDialogResolver?.(action);
    this.unsavedDialogResolver = null;
  }
}
