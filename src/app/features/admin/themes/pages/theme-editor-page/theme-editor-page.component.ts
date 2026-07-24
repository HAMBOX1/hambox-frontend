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
import { TooltipModule } from 'primeng/tooltip';

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
import { contrastRatio } from '../../../../../shared/utils/color.util';
import { ThemePreviewPanelComponent } from '../../components/theme-preview-panel/theme-preview-panel.component';
import { ThemeVisualEditorComponent } from '../../components/theme-visual-editor/theme-visual-editor.component';
import {
  CreateThemeRequest,
  THEME_BASE_MODE_OPTIONS,
  ThemeDetailDto,
  latestThemeVersion,
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
    TooltipModule,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminSectionCardComponent,
    AdminLoadingSkeletonComponent,
    AdminStickySaveBarComponent,
    ThemeVisualEditorComponent,
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

  private tokenHistory: Record<string, string>[] = [];
  private historyIndex = -1;
  protected readonly canUndo = signal(false);
  protected readonly canRedo = signal(false);

  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailSaving = this.facade.detailSaving;
  protected readonly detailError = this.facade.detailError;

  protected readonly serverWarnings = computed(
    () => latestThemeVersion(this.facade.detail())?.validationWarnings ?? [],
  );

  protected readonly liveWarnings = computed(() => {
    const tokens = this.tokens();
    const warnings: string[] = [];

    const primaryOnBackground = contrastRatio(tokens['primary'], tokens['background']);
    if (primaryOnBackground !== null && primaryOnBackground < 4.5) {
      warnings.push(
        `Primary vs background contrast is ${primaryOnBackground.toFixed(2)}:1 — WCAG AA needs 4.5:1.`,
      );
    }

    const cardOnBackground = contrastRatio(tokens['card'], tokens['background']);
    if (cardOnBackground !== null && cardOnBackground < 1.2) {
      warnings.push('Card background barely differs from the page background — content may be hard to distinguish.');
    }

    return warnings;
  });

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

  private lastLoadedDetail: ThemeDetailDto | null = null;

  constructor() {
    effect(() => {
      const detail = this.facade.detail();
      if (!detail || this.isCreateMode() || detail === this.lastLoadedDetail) {
        return;
      }
      this.lastLoadedDetail = detail;

      this.name.set(detail.name);
      this.slug.set(detail.slug);
      this.description.set(detail.description ?? '');
      this.baseMode.set(detail.baseMode);
      const loadedTokens = tokensFromDetail(detail);
      this.tokens.set(loadedTokens);
      this.resetHistory(loadedTokens);
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

    const defaultTokens = {
      primary: '#50ed95',
      background: '#131314',
      surface: '#1a1a1c',
      card: '#2a2a2b',
      border: 'rgba(255, 255, 255, 0.1)',
      typography: "'Inter', system-ui, sans-serif",
    };
    this.tokens.set(defaultTokens);
    this.resetHistory(defaultTokens);
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
    this.tokenHistory = [...this.tokenHistory.slice(0, this.historyIndex + 1), next];
    this.historyIndex = this.tokenHistory.length - 1;
    this.updateHistoryFlags();
  }

  protected undo(): void {
    if (this.historyIndex <= 0) {
      return;
    }
    this.historyIndex--;
    this.tokens.set(this.tokenHistory[this.historyIndex]);
    this.updateHistoryFlags();
  }

  protected redo(): void {
    if (this.historyIndex >= this.tokenHistory.length - 1) {
      return;
    }
    this.historyIndex++;
    this.tokens.set(this.tokenHistory[this.historyIndex]);
    this.updateHistoryFlags();
  }

  private resetHistory(snapshot: Record<string, string>): void {
    this.tokenHistory = [snapshot];
    this.historyIndex = 0;
    this.updateHistoryFlags();
  }

  private updateHistoryFlags(): void {
    this.canUndo.set(this.historyIndex > 0);
    this.canRedo.set(this.historyIndex < this.tokenHistory.length - 1);
  }

  private saveInFlight = false;

  protected async save(): Promise<void> {
    if (this.saveInFlight) {
      return;
    }
    this.saveInFlight = true;
    try {
      await this.performSave();
    } finally {
      this.saveInFlight = false;
    }
  }

  private async performSave(): Promise<void> {
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
