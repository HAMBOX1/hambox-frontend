import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';

export interface ApiRequestOptions {
  readonly headers?: HttpHeaders | Record<string, string | string[]>;
  readonly params?: HttpParams | Record<string, string | number | boolean>;
  readonly context?: HttpContext;
  readonly withCredentials?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  get<T>(path: string, options?: ApiRequestOptions): Observable<T> {
    return this.http.get<T>(this.resolveUrl(path), options);
  }

  post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.post<T>(this.resolveUrl(path), body ?? null, options);
  }

  put<T>(path: string, body?: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.put<T>(this.resolveUrl(path), body ?? null, options);
  }

  patch<T>(path: string, body?: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.patch<T>(this.resolveUrl(path), body ?? null, options);
  }

  delete<T>(path: string, options?: ApiRequestOptions): Observable<T> {
    return this.http.delete<T>(this.resolveUrl(path), options);
  }

  private resolveUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const base = this.apiBaseUrl.replace(/\/$/, '');
    return `${base}${normalizedPath}`;
  }
}
