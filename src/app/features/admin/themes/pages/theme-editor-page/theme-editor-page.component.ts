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
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { ThemeEngineService } from '../../../../../core/theme/theme-engine.service';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStickySaveBarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { ThemePreviewPanelComponent } from '../../components/theme-preview-panel/theme-preview-panel.component';
import { ThemeTokenEditorComponent } from '../../components/theme-token-editor/theme-token-editor.component';
import {
  CreateThemeRequest,
  THEME_BASE_MODE_OPTIONS,
  tokensFromDetail,
  UpdateThemeRequest,
} from '../../models/theme-api.model';
import { ThemeManagementFacade } from '../../services/theme-management.facade';

@Component({
  selector: 'app-theme-editor-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToastModule,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminSectionCardComponent,
    AdminLoadingSkeletonComponent,
    AdminStickySaveBarComponent,
    ThemeTokenEditorComponent,
    ThemePreviewPanelComponent,
  ],
  providers: [ThemeManagementFacade, MessageService],
  templateUrl: './theme-editor-page.component.html',
  styleUrl: './theme-editor-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeEditorPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly themeEngine = inject(ThemeEngineService);
  protected readonly facade = inject(ThemeManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;
  protected readonly baseModeOptions = [...THEME_BASE_MODE_OPTIONS];

  protected readonly themeId = signal<string | null>(null);
  protected readonly isCreateMode = computed(() => this.themeId() === null);

  protected readonly name = signal('');
  protected readonly slug = signal('');
  protected readonly description = signal('');
  protected readonly baseMode = signal('Dark');
  protected readonly notes = signal('');
  protected readonly tokens = signal<Record<string, string>>({});

  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailSaving = this.facade.detailSaving;
  protected readonly detailError = this.facade.detailError;

  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      {
        label: this.translate.instant('ADMIN.THEMES.LIST.TITLE'),
        route: '/admin/themes',
      },
      {
        label: this.translate.instant(
          this.isCreateMode()
            ? 'ADMIN.THEMES.EDIT.CREATE_TITLE'
            : 'ADMIN.THEMES.EDIT.EDIT_TITLE',
        ),
      },
    ),
  );

  constructor() {
    effect(() => {
      const detail = this.facade.detail();
      if (!detail || this.isCreateMode()) {
        return;
      }

      this.name.set(detail.name);
      this.slug.set(detail.slug);
      this.description.set(detail.description ?? '');
      this.baseMode.set(detail.baseMode);
      this.tokens.set(tokensFromDetail(detail));
      this.applyLivePreview();
    });

    effect(() => {
      this.tokens();
      this.baseMode();
      this.applyLivePreview();
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.themeId.set(id);
      void this.facade.loadDetail(id);
      return;
    }

    this.tokens.set({
      primary: '#50ed95',
      background: '#131314',
      surface: '#1a1a1c',
      card: '#2a2a2b',
      border: 'rgba(255, 255, 255, 0.1)',
      typography: "'Inter', system-ui, sans-serif",
    });
    this.applyLivePreview();
  }

  ngOnDestroy(): void {
    if (this.themeEngine.previewMode()) {
      this.themeEngine.deactivatePreview();
      return;
    }

    this.themeEngine.restoreActiveTheme();
  }

  protected onTokensChange(next: Record<string, string>): void {
    this.tokens.set(next);
  }

  protected async save(): Promise<void> {
    if (this.isCreateMode()) {
      const request: CreateThemeRequest = {
        name: this.name().trim(),
        slug: this.slug().trim(),
        description: this.description().trim() || null,
        baseMode: this.baseMode(),
        tokens: this.tokens(),
      };

      const createdId = await this.facade.createTheme(request);
      if (createdId) {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('ADMIN.THEMES.MESSAGES.CREATED'),
          life: 4000,
        });
        void this.router.navigate(['/admin/themes', createdId, 'edit']);
      }
      return;
    }

    const id = this.themeId();
    if (!id) {
      return;
    }

    const request: UpdateThemeRequest = {
      name: this.name().trim(),
      description: this.description().trim() || null,
      tokens: this.tokens(),
      notes: this.notes().trim() || null,
    };

    const success = await this.facade.updateTheme(id, request);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.THEMES.MESSAGES.SAVED'),
        life: 4000,
      });
    }
  }

  protected async startPreview(): Promise<void> {
    const id = this.themeId();
    if (!id) {
      this.applyLivePreview();
      return;
    }

    const session = await this.facade.createPreviewSession(id);
    if (session) {
      await this.themeEngine.activatePreview(session.token);
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('ADMIN.THEMES.MESSAGES.PREVIEW_STARTED'),
        life: 4000,
      });
    }
  }

  private applyLivePreview(): void {
    this.themeEngine.applyEditorPreview(this.baseMode(), this.tokens());
  }
}
