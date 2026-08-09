import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { ThemeEngineService } from '../../../../../core/theme/theme-engine.service';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminStickySaveBarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { ThemePickerComponent } from '../../../../../shared/components/admin/theme-picker/theme-picker.component';
import { ThemeManagementFacade } from '../../../themes/services/theme-management.facade';
import { CampaignDetailDto, CreateCampaignRequest, UpdateCampaignRequest } from '../../models/campaign-api.model';
import { CampaignManagementFacade } from '../../services/campaign-management.facade';

@Component({
  selector: 'app-campaign-form-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    ToastModule,
    TooltipModule,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminSectionCardComponent,
    AdminLoadingSkeletonComponent,
    AdminStickySaveBarComponent,
    AdminStatusBadgeComponent,
    ThemePickerComponent,
    HasPermissionDirective,
  ],
  providers: [CampaignManagementFacade, ThemeManagementFacade, MessageService],
  templateUrl: './campaign-form-page.component.html',
  styleUrl: './campaign-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignFormPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly themeEngine = inject(ThemeEngineService);
  private readonly themeFacade = inject(ThemeManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  protected readonly facade = inject(CampaignManagementFacade);

  protected readonly permissions = PERMISSIONS;

  protected readonly campaignId = signal<string | null>(null);
  protected readonly isCreateMode = computed(() => this.campaignId() === null);

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly themeId = signal<string | null>(null);
  protected readonly startsAt = signal('');
  protected readonly endsAt = signal('');
  protected readonly priority = signal(0);

  protected readonly detail = this.facade.detail;
  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailSaving = this.facade.detailSaving;
  protected readonly detailError = this.facade.detailError;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly history = this.facade.history;

  protected readonly previewMode = this.themeEngine.previewMode;

  protected readonly selectedThemeIds = computed(() => (this.themeId() ? [this.themeId()!] : []));

  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      { label: this.translate.instant('ADMIN.CAMPAIGNS.LIST.TITLE'), route: '/admin/campaigns' },
      {
        label: this.translate.instant(
          this.isCreateMode() ? 'ADMIN.CAMPAIGNS.FORM.CREATE_TITLE' : 'ADMIN.CAMPAIGNS.FORM.EDIT_TITLE',
        ),
      },
    ),
  );

  protected readonly canPublish = computed(() => !this.isCreateMode() && this.detail()?.status === 'Draft');
  protected readonly themeNotPublishable = computed(
    () => !this.isCreateMode() && this.detail()?.themeIsPublishable === false,
  );

  private lastLoadedDetail: CampaignDetailDto | null = null;

  constructor() {
    effect(() => {
      const detail = this.detail();
      if (!detail || this.isCreateMode() || detail === this.lastLoadedDetail) {
        return;
      }
      this.lastLoadedDetail = detail;

      this.name.set(detail.name);
      this.description.set(detail.description ?? '');
      this.themeId.set(detail.themeId);
      this.startsAt.set(this.toLocalInput(detail.startsAtUtc));
      this.endsAt.set(this.toLocalInput(detail.endsAtUtc));
      this.priority.set(detail.priority);
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.campaignId.set(id);
      void this.facade.loadDetail(id);
      void this.facade.loadHistory(id);
    }
  }

  ngOnDestroy(): void {
    if (this.themeEngine.previewMode()) {
      this.themeEngine.deactivatePreview();
    }
  }

  protected onThemeSelectionChange(ids: readonly string[]): void {
    // ThemePickerComponent is multi-select by design (Membership Theme Unlock); a campaign uses
    // exactly one theme, so only the most recently toggled id is kept.
    const current = this.themeId();
    const next = ids.find((id) => id !== current) ?? ids[ids.length - 1] ?? null;
    this.themeId.set(next);
  }

  private saveInFlight = false;

  protected async save(): Promise<void> {
    if (this.saveInFlight || !this.isFormValid()) {
      return;
    }
    this.saveInFlight = true;
    try {
      await this.performSave();
    } finally {
      this.saveInFlight = false;
    }
  }

  private isFormValid(): boolean {
    return !!this.name().trim() && !!this.themeId() && !!this.startsAt() && !!this.endsAt();
  }

  private async performSave(): Promise<void> {
    const themeId = this.themeId();
    if (!themeId) {
      return;
    }

    const startsAtUtc = new Date(this.startsAt()).toISOString();
    const endsAtUtc = new Date(this.endsAt()).toISOString();

    if (this.isCreateMode()) {
      const request: CreateCampaignRequest = {
        name: this.name().trim(),
        description: this.description().trim() || null,
        themeId,
        startsAtUtc,
        endsAtUtc,
        priority: this.priority(),
      };

      const createdId = await this.facade.createCampaign(request);
      if (createdId) {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('ADMIN.CAMPAIGNS.MESSAGES.CREATED'),
          life: 4000,
        });
        void this.router.navigate(['/admin/campaigns', createdId, 'edit']);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: this.facade.detailError() ?? this.translate.instant('ADMIN.CAMPAIGNS.MESSAGES.CREATE_FAILED'),
          life: 6000,
        });
      }
      return;
    }

    const id = this.campaignId();
    if (!id) {
      return;
    }

    const request: UpdateCampaignRequest = {
      name: this.name().trim(),
      description: this.description().trim() || null,
      themeId,
      startsAtUtc,
      endsAtUtc,
      priority: this.priority(),
    };

    const success = await this.facade.updateCampaign(id, request);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CAMPAIGNS.MESSAGES.SAVED'),
        life: 4000,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.facade.detailError() ?? this.translate.instant('ADMIN.CAMPAIGNS.MESSAGES.SAVE_FAILED'),
        life: 6000,
      });
    }
  }

  protected async publish(): Promise<void> {
    const id = this.campaignId();
    if (!id) {
      return;
    }

    const success = await this.facade.publishCampaign(id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CAMPAIGNS.MESSAGES.PUBLISHED'),
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.facade.detailError() ?? this.translate.instant('ADMIN.CAMPAIGNS.MESSAGES.PUBLISH_FAILED'),
      life: 6000,
    });
  }

  protected async enable(): Promise<void> {
    const id = this.campaignId();
    if (!id) {
      return;
    }
    const success = await this.facade.enableCampaign(id);
    if (success) {
      await this.facade.loadDetail(id);
    }
  }

  protected async disable(): Promise<void> {
    const id = this.campaignId();
    if (!id) {
      return;
    }
    const success = await this.facade.disableCampaign(id);
    if (success) {
      await this.facade.loadDetail(id);
    }
  }

  protected async archive(): Promise<void> {
    const id = this.campaignId();
    if (!id) {
      return;
    }
    const success = await this.facade.archiveCampaign(id);
    if (success) {
      await this.facade.loadDetail(id);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CAMPAIGNS.MESSAGES.ARCHIVED'),
        life: 4000,
      });
    }
  }

  protected async startPreview(): Promise<void> {
    const themeId = this.themeId();
    if (!themeId) {
      return;
    }

    // Preview is entirely the existing Theme preview mechanism, reused as-is: no
    // campaign-specific preview session, no second isolation mechanism to maintain.
    const session = await this.themeFacade.createPreviewSession(themeId);
    if (session) {
      await this.themeEngine.activatePreview(session.token);
      window.open(`/?themePreview=${session.token}`, '_blank', 'noopener');
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('ADMIN.CAMPAIGNS.MESSAGES.PREVIEW_STARTED'),
        life: 4000,
      });
    }
  }

  protected exitPreview(): void {
    this.themeEngine.deactivatePreview();
  }

  private toLocalInput(iso: string): string {
    const date = new Date(iso);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
