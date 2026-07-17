import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../../core/api/api-client.service';
import { LEGAL_API } from '../../../../core/api/api-endpoints';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  CreateLegalSectionRequest,
  DuplicateLegalSectionRequest,
  LegalSectionDetailDto,
  LegalSectionHistoryEntryDto,
  LegalSectionListItemDto,
  LegalSectionQueryFilter,
  UpdateLegalSectionRequest,
} from '../models/legal-section.model';

@Injectable()
export class LegalManagementFacade {
  private readonly api = inject(ApiClientService);

  private readonly documentsState = signal<readonly LegalSectionListItemDto[]>([]);
  private readonly documentsLoadingState = signal(false);
  private readonly documentsErrorState = signal<string | null>(null);

  private readonly detailState = signal<LegalSectionDetailDto | null>(null);
  private readonly detailLoadingState = signal(false);
  private readonly detailErrorState = signal<string | null>(null);
  private readonly savingState = signal(false);

  private readonly historyState = signal<readonly LegalSectionHistoryEntryDto[]>([]);
  private readonly historyLoadingState = signal(false);
  private readonly historyErrorState = signal<string | null>(null);

  private readonly actionLoadingState = signal(false);

  readonly documents = this.documentsState.asReadonly();
  readonly documentsLoading = this.documentsLoadingState.asReadonly();
  readonly documentsError = this.documentsErrorState.asReadonly();

  readonly detail = this.detailState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly detailError = this.detailErrorState.asReadonly();
  readonly saving = this.savingState.asReadonly();

  readonly history = this.historyState.asReadonly();
  readonly historyLoading = this.historyLoadingState.asReadonly();
  readonly historyError = this.historyErrorState.asReadonly();

  readonly actionLoading = this.actionLoadingState.asReadonly();

  async loadDocuments(filter?: LegalSectionQueryFilter): Promise<void> {
    this.documentsLoadingState.set(true);
    this.documentsErrorState.set(null);

    try {
      const items = await firstValueFrom(
        this.api.get<LegalSectionListItemDto[]>(LEGAL_API.documents, { params: toQueryParams(filter) }),
      );
      this.documentsState.set(items ?? []);
    } catch (error) {
      this.documentsState.set([]);
      this.documentsErrorState.set(this.toErrorMessage(error, 'Failed to load legal sections.'));
    } finally {
      this.documentsLoadingState.set(false);
    }
  }

  async loadDetail(slug: string): Promise<void> {
    this.detailLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      const detail = await firstValueFrom(
        this.api.get<LegalSectionDetailDto>(LEGAL_API.document(slug)),
      );
      this.detailState.set(detail);
    } catch (error) {
      this.detailState.set(null);
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to load legal section.'));
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  async loadHistory(slug: string): Promise<void> {
    this.historyLoadingState.set(true);
    this.historyErrorState.set(null);

    try {
      const history = await firstValueFrom(
        this.api.get<LegalSectionHistoryEntryDto[]>(LEGAL_API.history(slug)),
      );
      this.historyState.set(history ?? []);
    } catch (error) {
      this.historyState.set([]);
      this.historyErrorState.set(this.toErrorMessage(error, 'Failed to load history.'));
    } finally {
      this.historyLoadingState.set(false);
    }
  }

  async createSection(request: CreateLegalSectionRequest): Promise<boolean> {
    this.savingState.set(true);
    this.documentsErrorState.set(null);

    try {
      await firstValueFrom(this.api.post<void>(LEGAL_API.documents, request));
      return true;
    } catch (error) {
      this.documentsErrorState.set(this.toErrorMessage(error, 'Failed to create legal section.'));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  async updateDocument(slug: string, request: UpdateLegalSectionRequest): Promise<boolean> {
    this.savingState.set(true);
    this.detailErrorState.set(null);

    try {
      await firstValueFrom(this.api.put<void>(LEGAL_API.update(slug), request));
      await this.loadDetail(request.slug);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to save legal section.'));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  async publishDocument(slug: string, versionId?: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      await firstValueFrom(this.api.post<void>(LEGAL_API.publish(slug), versionId ?? null));
      await this.loadDetail(slug);
      await this.loadHistory(slug);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to publish legal section.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  /** Restore an older version — re-publishes that exact version, same endpoint as a normal publish. */
  async restoreVersion(slug: string, versionId: string): Promise<boolean> {
    return this.publishDocument(slug, versionId);
  }

  async archiveSection(slug: string, archived: boolean): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.documentsErrorState.set(null);

    try {
      await firstValueFrom(this.api.post<void>(LEGAL_API.archive(slug), { archived }));
      return true;
    } catch (error) {
      this.documentsErrorState.set(this.toErrorMessage(error, 'Failed to update section visibility.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async duplicateSection(slug: string, request: DuplicateLegalSectionRequest): Promise<string | null> {
    this.actionLoadingState.set(true);
    this.documentsErrorState.set(null);

    try {
      return await firstValueFrom(this.api.post<string>(LEGAL_API.duplicate(slug), request));
    } catch (error) {
      this.documentsErrorState.set(this.toErrorMessage(error, 'Failed to duplicate legal section.'));
      return null;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async deleteSection(slug: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.documentsErrorState.set(null);

    try {
      await firstValueFrom(this.api.delete<void>(LEGAL_API.delete(slug)));
      return true;
    } catch (error) {
      this.documentsErrorState.set(this.toErrorMessage(error, 'Failed to delete legal section.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
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

function toQueryParams(filter?: LegalSectionQueryFilter): Record<string, string | number | boolean> {
  if (!filter) {
    return {};
  }

  const params: Record<string, string | number | boolean> = {};
  if (filter.search) params['search'] = filter.search;
  if (filter.category) params['category'] = filter.category;
  if (filter.status) params['status'] = filter.status;
  if (filter.showInFooter !== undefined) params['showInFooter'] = filter.showInFooter;
  if (filter.showInNavigation !== undefined) params['showInNavigation'] = filter.showInNavigation;
  if (filter.requireAcceptance !== undefined) params['requireAcceptance'] = filter.requireAcceptance;
  return params;
}
