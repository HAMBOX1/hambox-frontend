import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { PAGE_BUILDER_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import {
  LandingPageSectionEntry,
  LandingPageTemplateDetail,
  LandingPageTemplateSummary,
} from '../models/page-builder.model';

@Injectable({
  providedIn: 'root',
})
export class PageBuilderApiService {
  private readonly api = inject(ApiClientService);

  listTemplates(): Observable<LandingPageTemplateSummary[]> {
    return this.api.get<LandingPageTemplateSummary[]>(PAGE_BUILDER_API.templates);
  }

  getTemplate(id: string): Observable<LandingPageTemplateDetail> {
    return this.api.get<LandingPageTemplateDetail>(PAGE_BUILDER_API.template(id));
  }

  createTemplate(name: string, cloneFromTemplateId?: string): Observable<LandingPageTemplateDetail> {
    return this.api.post<LandingPageTemplateDetail>(PAGE_BUILDER_API.templates, {
      name,
      cloneFromTemplateId: cloneFromTemplateId ?? null,
    });
  }

  saveDraft(id: string, sections: readonly LandingPageSectionEntry[]): Observable<LandingPageTemplateDetail> {
    return this.api.put<LandingPageTemplateDetail>(PAGE_BUILDER_API.templateDraft(id), { sections });
  }

  publish(id: string): Observable<LandingPageTemplateDetail> {
    return this.api.post<LandingPageTemplateDetail>(PAGE_BUILDER_API.templatePublish(id));
  }

  discardDraft(id: string): Observable<LandingPageTemplateDetail> {
    return this.api.post<LandingPageTemplateDetail>(PAGE_BUILDER_API.templateDiscardDraft(id));
  }

  deleteTemplate(id: string): Observable<void> {
    return this.api.delete<void>(PAGE_BUILDER_API.template(id));
  }

  activateTemplate(id: string): Observable<void> {
    return this.api.post<void>(PAGE_BUILDER_API.templateActivate(id));
  }

  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.post<{ url: string }>(PAGE_BUILDER_API.templateImages, formData);
  }
}
