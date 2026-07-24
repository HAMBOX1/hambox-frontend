import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { THEMES_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  AssignThemeRequest,
  CreateThemeRequest,
  DuplicateThemeRequest,
  ExportThemeDto,
  ImportThemeRequest,
  ScheduleThemeRequest,
  ThemeAssetRequest,
  ThemeCompareDto,
  ThemeDetailDto,
  ThemeHistoryEntryDto,
  ThemeListItemDto,
  ThemeListQuery,
  ThemeListResult,
  ThemePreviewSessionDto,
  ThemeStatisticsDto,
  ThemeTemplateDto,
  UpdateThemeRequest,
} from '../models/theme-api.model';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Injectable()
export class ThemeManagementFacade {
  private readonly api = inject(ApiClientService);

  private readonly themesState = signal<readonly ThemeListItemDto[]>([]);
  private readonly themesLoadingState = signal(false);
  private readonly themesErrorState = signal<string | null>(null);
  private readonly searchTermState = signal('');
  private readonly statusFilterState = signal('all');
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly hasLoadedThemesState = signal(false);

  private readonly detailState = signal<ThemeDetailDto | null>(null);
  private readonly detailLoadingState = signal(false);
  private readonly detailSavingState = signal(false);
  private readonly detailErrorState = signal<string | null>(null);

  private readonly statisticsState = signal<ThemeStatisticsDto | null>(null);
  private readonly statisticsLoadingState = signal(false);
  private readonly statisticsErrorState = signal<string | null>(null);

  private readonly historyState = signal<readonly ThemeHistoryEntryDto[]>([]);
  private readonly historyLoadingState = signal(false);
  private readonly historyErrorState = signal<string | null>(null);

  private readonly compareState = signal<ThemeCompareDto | null>(null);
  private readonly compareLoadingState = signal(false);
  private readonly compareErrorState = signal<string | null>(null);

  private readonly actionLoadingState = signal(false);

  private readonly templatesState = signal<readonly ThemeTemplateDto[]>([]);
  private readonly templatesLoadingState = signal(false);
  private readonly templatesErrorState = signal<string | null>(null);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly themes = this.themesState.asReadonly();
  readonly themesLoading = this.themesLoadingState.asReadonly();
  readonly themesError = this.themesErrorState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly statusFilter = this.statusFilterState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();

  readonly detail = this.detailState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly detailSaving = this.detailSavingState.asReadonly();
  readonly detailError = this.detailErrorState.asReadonly();

  readonly statistics = this.statisticsState.asReadonly();
  readonly statisticsLoading = this.statisticsLoadingState.asReadonly();
  readonly statisticsError = this.statisticsErrorState.asReadonly();

  readonly history = this.historyState.asReadonly();
  readonly historyLoading = this.historyLoadingState.asReadonly();
  readonly historyError = this.historyErrorState.asReadonly();

  readonly compare = this.compareState.asReadonly();
  readonly compareLoading = this.compareLoadingState.asReadonly();
  readonly compareError = this.compareErrorState.asReadonly();

  readonly actionLoading = this.actionLoadingState.asReadonly();

  readonly templates = this.templatesState.asReadonly();
  readonly templatesLoading = this.templatesLoadingState.asReadonly();
  readonly templatesError = this.templatesErrorState.asReadonly();

  readonly hasActiveFilters = computed(
    () => this.searchTermState().trim().length > 0 || this.statusFilterState() !== 'all',
  );

  readonly listStats = computed(() => {
    const stats = this.statisticsState();
    if (stats) {
      return {
        total: stats.totalThemes,
        published: stats.publishedThemes,
        draft: stats.draftThemes,
        archived: stats.archivedThemes,
      };
    }

    const items = this.themesState();
    return {
      total: this.totalCountState(),
      published: items.filter((item) => item.status === 'Published').length,
      draft: items.filter((item) => item.status === 'Draft').length,
      archived: items.filter((item) => item.status === 'Archived').length,
    };
  });

  loadThemes(): void {
    void this.fetchThemes(true);
  }

  reloadThemes(): Promise<void> {
    return this.fetchThemes(true);
  }

  loadStatistics(): void {
    void this.fetchStatistics();
  }

  async loadTemplates(): Promise<void> {
    this.templatesLoadingState.set(true);
    this.templatesErrorState.set(null);

    try {
      const templates = await firstValueFrom(
        this.api.get<ThemeTemplateDto[]>(THEMES_API.templates),
      );
      this.templatesState.set(templates ?? []);
    } catch (error) {
      this.templatesState.set([]);
      this.templatesErrorState.set(this.toErrorMessage(error, 'Failed to load templates.'));
    } finally {
      this.templatesLoadingState.set(false);
    }
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    this.scheduleThemesReload();
  }

  setStatusFilter(status: string): void {
    this.statusFilterState.set(status);
    this.pageNumberState.set(1);
    void this.fetchThemes();
  }

  setPage(pageNumber: number, pageSize: number): void {
    if (
      this.pageNumberState() === pageNumber &&
      this.pageSizeState() === pageSize &&
      this.hasLoadedThemesState()
    ) {
      return;
    }

    this.pageNumberState.set(pageNumber);
    this.pageSizeState.set(pageSize);
    void this.fetchThemes();
  }

  async loadDetail(themeId: string): Promise<void> {
    this.detailLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      const detail = await firstValueFrom(
        this.api.get<ThemeDetailDto>(THEMES_API.theme(themeId)),
      );
      this.detailState.set(detail);
    } catch (error) {
      this.detailState.set(null);
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to load theme.'));
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  resetDetail(): void {
    this.detailState.set(null);
    this.detailErrorState.set(null);
    this.historyState.set([]);
    this.compareState.set(null);
  }

  async loadHistory(themeId: string): Promise<void> {
    this.historyLoadingState.set(true);
    this.historyErrorState.set(null);

    try {
      const history = await firstValueFrom(
        this.api.get<ThemeHistoryEntryDto[]>(THEMES_API.history(themeId)),
      );
      this.historyState.set(history ?? []);
    } catch (error) {
      this.historyState.set([]);
      this.historyErrorState.set(this.toErrorMessage(error, 'Failed to load history.'));
    } finally {
      this.historyLoadingState.set(false);
    }
  }

  async loadCompare(leftId: string, rightId: string): Promise<void> {
    this.compareLoadingState.set(true);
    this.compareErrorState.set(null);

    try {
      const compare = await firstValueFrom(
        this.api.get<ThemeCompareDto>(THEMES_API.compare, {
          params: { leftId, rightId },
        }),
      );
      this.compareState.set(compare);
    } catch (error) {
      this.compareState.set(null);
      this.compareErrorState.set(this.toErrorMessage(error, 'Failed to compare themes.'));
    } finally {
      this.compareLoadingState.set(false);
    }
  }

  async createTheme(request: CreateThemeRequest): Promise<string | null> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    try {
      return await firstValueFrom(this.api.post<string>(THEMES_API.themes, request));
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to create theme.'));
      return null;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async updateTheme(themeId: string, request: UpdateThemeRequest): Promise<boolean> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    try {
      await firstValueFrom(this.api.put<void>(THEMES_API.theme(themeId), request));
      await this.loadDetail(themeId);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to update theme.'));
      return false;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async deleteTheme(themeId: string): Promise<boolean> {
    this.actionLoadingState.set(true);

    try {
      await firstValueFrom(this.api.delete<void>(THEMES_API.theme(themeId)));
      await this.fetchThemes(true);
      return true;
    } catch (error) {
      this.themesErrorState.set(this.toErrorMessage(error, 'Failed to delete theme.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async duplicateTheme(themeId: string, request: DuplicateThemeRequest): Promise<string | null> {
    this.actionLoadingState.set(true);
    this.themesErrorState.set(null);

    try {
      const createdId = await firstValueFrom(
        this.api.post<string>(THEMES_API.duplicate(themeId), request),
      );
      await this.fetchThemes(true);
      return createdId;
    } catch (error) {
      this.themesErrorState.set(this.toErrorMessage(error, 'Failed to duplicate theme.'));
      return null;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async publishTheme(themeId: string, versionId?: string): Promise<boolean> {
    return this.runAction(async () => {
      await firstValueFrom(
        this.api.post<void>(THEMES_API.publish(themeId), versionId ?? null),
      );
      await this.fetchThemes(true);
    });
  }

  async archiveTheme(themeId: string): Promise<boolean> {
    return this.runAction(async () => {
      await firstValueFrom(this.api.post<void>(THEMES_API.archive(themeId), {}));
      await this.fetchThemes(true);
    });
  }

  async rollbackTheme(themeId: string, versionId: string): Promise<boolean> {
    return this.runAction(async () => {
      await firstValueFrom(this.api.post<void>(THEMES_API.rollback(themeId), versionId));
      await this.loadDetail(themeId);
    });
  }

  async createPreviewSession(
    themeId: string,
    versionId?: string,
  ): Promise<ThemePreviewSessionDto | null> {
    this.actionLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      return await firstValueFrom(
        this.api.post<ThemePreviewSessionDto>(THEMES_API.previewSession(themeId), versionId ?? null),
      );
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to create preview session.'));
      return null;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async scheduleTheme(themeId: string, request: ScheduleThemeRequest): Promise<boolean> {
    return this.runAction(async () => {
      await firstValueFrom(this.api.post<void>(THEMES_API.schedule(themeId), request));
      await this.loadDetail(themeId);
    });
  }

  async assignTheme(themeId: string, request: AssignThemeRequest): Promise<boolean> {
    return this.runAction(async () => {
      await firstValueFrom(this.api.post<void>(THEMES_API.assign(themeId), request));
      await this.loadDetail(themeId);
    });
  }

  async updateAssets(themeId: string, assets: ThemeAssetRequest[]): Promise<boolean> {
    return this.runAction(async () => {
      await firstValueFrom(this.api.put<void>(THEMES_API.assets(themeId), assets));
      await this.loadDetail(themeId);
    });
  }

  async exportTheme(themeId: string): Promise<ExportThemeDto | null> {
    this.actionLoadingState.set(true);

    try {
      return await firstValueFrom(this.api.get<ExportThemeDto>(THEMES_API.export(themeId)));
    } catch (error) {
      this.themesErrorState.set(this.toErrorMessage(error, 'Failed to export theme.'));
      return null;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async importTheme(request: ImportThemeRequest): Promise<string | null> {
    this.actionLoadingState.set(true);
    this.themesErrorState.set(null);

    try {
      const createdId = await firstValueFrom(
        this.api.post<string>(THEMES_API.import, request),
      );
      await this.fetchThemes(true);
      return createdId;
    } catch (error) {
      this.themesErrorState.set(this.toErrorMessage(error, 'Failed to import theme.'));
      return null;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private async runAction(action: () => Promise<void>): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.themesErrorState.set(null);

    try {
      await action();
      return true;
    } catch (error) {
      this.themesErrorState.set(this.toErrorMessage(error, 'Action failed.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private scheduleThemesReload(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.fetchThemes();
    }, SEARCH_DEBOUNCE_MS);
  }

  private async fetchStatistics(): Promise<void> {
    this.statisticsLoadingState.set(true);
    this.statisticsErrorState.set(null);

    try {
      const stats = await firstValueFrom(
        this.api.get<ThemeStatisticsDto>(THEMES_API.statistics),
      );
      this.statisticsState.set(stats);
    } catch (error) {
      this.statisticsState.set(null);
      this.statisticsErrorState.set(this.toErrorMessage(error, 'Failed to load statistics.'));
    } finally {
      this.statisticsLoadingState.set(false);
    }
  }

  private async fetchThemes(force = false): Promise<void> {
    this.themesLoadingState.set(true);
    this.themesErrorState.set(null);

    const query: ThemeListQuery = {
      pageNumber: this.pageNumberState(),
      pageSize: this.pageSizeState(),
      searchTerm: this.searchTermState(),
      status: this.statusFilterState(),
    };

    try {
      const result = await firstValueFrom(
        this.api.get<ThemeListResult>(THEMES_API.themes, {
          params: {
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            ...(query.searchTerm?.trim() ? { searchTerm: query.searchTerm.trim() } : {}),
            ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
          },
        }),
      );

      this.themesState.set(result.items ?? []);
      this.totalCountState.set(result.totalCount ?? 0);
      this.pageNumberState.set(result.pageNumber ?? query.pageNumber);
      this.pageSizeState.set(result.pageSize ?? query.pageSize);
      this.hasLoadedThemesState.set(true);

      if (force) {
        void this.fetchStatistics();
      }
    } catch (error) {
      this.themesState.set([]);
      this.totalCountState.set(0);
      this.themesErrorState.set(this.toErrorMessage(error, 'Failed to load themes.'));
    } finally {
      this.themesLoadingState.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to perform this action.';
      }

      return error.message;
    }

    return fallback;
  }
}
