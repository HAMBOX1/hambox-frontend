import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { LEGAL_API } from '../../../core/api/api-endpoints';
import { PublicLegalSectionDto, PublicLegalSectionSummaryDto } from '../models/legal-section.model';

@Injectable({ providedIn: 'root' })
export class LegalService {
  private readonly api = inject(ApiClientService);

  private readonly documentsState = signal<readonly PublicLegalSectionSummaryDto[]>([]);
  private readonly documentsLoadingState = signal(false);

  private readonly activeDocumentState = signal<PublicLegalSectionDto | null>(null);
  private readonly activeLoadingState = signal(false);
  private readonly activeErrorState = signal<string | null>(null);

  readonly documents = this.documentsState.asReadonly();
  readonly documentsLoading = this.documentsLoadingState.asReadonly();

  readonly activeDocument = this.activeDocumentState.asReadonly();
  readonly activeLoading = this.activeLoadingState.asReadonly();
  readonly activeError = this.activeErrorState.asReadonly();

  async loadDocuments(): Promise<void> {
    this.documentsLoadingState.set(true);

    try {
      const items = await firstValueFrom(
        this.api.get<PublicLegalSectionSummaryDto[]>(LEGAL_API.publicDocuments),
      );
      this.documentsState.set(items ?? []);
    } catch {
      this.documentsState.set([]);
    } finally {
      this.documentsLoadingState.set(false);
    }
  }

  async loadDocument(slug: string): Promise<void> {
    this.activeLoadingState.set(true);
    this.activeErrorState.set(null);

    try {
      const document = await firstValueFrom(
        this.api.get<PublicLegalSectionDto>(LEGAL_API.publicDocument(slug)),
      );
      this.activeDocumentState.set(document);
    } catch {
      this.activeDocumentState.set(null);
      this.activeErrorState.set('This document is not available yet.');
    } finally {
      this.activeLoadingState.set(false);
    }
  }
}
