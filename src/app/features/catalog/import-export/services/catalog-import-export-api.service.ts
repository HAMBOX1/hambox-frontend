import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CATALOG_IMPORT_EXPORT_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';
import {
  CatalogDuplicateStrategy,
  CatalogExportRequest,
  CatalogImportEntityType,
  CatalogImportValidationReport,
  CatalogPackageJobDto,
  CatalogPackageOptions,
} from '../models/import-export.model';

@Injectable({
  providedIn: 'root',
})
export class CatalogImportExportApiService {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  exportCatalog(request: CatalogExportRequest): Observable<string> {
    return this.api.post<string>(CATALOG_IMPORT_EXPORT_API.export, request);
  }

  downloadTemplate(entityType: CatalogImportEntityType): Observable<Blob> {
    return this.http.get(this.resolveUrl(CATALOG_IMPORT_EXPORT_API.importTemplate(entityType)), {
      responseType: 'blob',
    });
  }

  uploadImport(file: File, entityType: CatalogImportEntityType): Observable<CatalogPackageJobDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('entityType', entityType);

    return this.api.post<CatalogPackageJobDto>(CATALOG_IMPORT_EXPORT_API.importUpload, formData);
  }

  validateImport(uploadId: string, packagePassword?: string): Observable<CatalogImportValidationReport> {
    return this.api.post<CatalogImportValidationReport>(CATALOG_IMPORT_EXPORT_API.importValidate(uploadId), {
      packagePassword: packagePassword || null,
    });
  }

  executeImport(
    uploadId: string,
    strategy: CatalogDuplicateStrategy,
    options: CatalogPackageOptions,
    packagePassword?: string,
  ): Observable<string> {
    return this.api.post<string>(CATALOG_IMPORT_EXPORT_API.importExecute(uploadId), {
      strategy,
      options,
      packagePassword: packagePassword || null,
    });
  }

  getJob(jobId: string): Observable<CatalogPackageJobDto> {
    return this.api.get<CatalogPackageJobDto>(CATALOG_IMPORT_EXPORT_API.job(jobId));
  }

  downloadJobResult(jobId: string): Observable<Blob> {
    return this.http.get(this.resolveUrl(CATALOG_IMPORT_EXPORT_API.jobDownload(jobId)), { responseType: 'blob' });
  }

  private resolveUrl(path: string): string {
    const base = this.apiBaseUrl.replace(/\/$/, '');
    return `${base}${path}`;
  }
}
