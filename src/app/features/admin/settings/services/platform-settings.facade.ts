import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { SETTINGS_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  PlatformSettingsAuditEntryDto,
  PlatformSettingsCategoryDto,
} from '../models/platform-settings.model';

@Injectable()
export class PlatformSettingsFacade {
  private readonly api = inject(ApiClientService);

  private readonly categoriesState = signal<PlatformSettingsCategoryDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly auditState = signal<PlatformSettingsAuditEntryDto[]>([]);

  readonly categories = this.categoriesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly audit = this.auditState.asReadonly();

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const data = await firstValueFrom(
        this.api.get<PlatformSettingsCategoryDto[]>(SETTINGS_API.settings),
      );
      this.categoriesState.set(data);
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to load platform settings.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadAudit(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.api.get<PlatformSettingsAuditEntryDto[]>(SETTINGS_API.audit),
      );
      this.auditState.set(data);
    } catch {
      // Non-blocking for the main settings UI.
    }
  }

  async saveCategory(categoryKey: string, payload: Record<string, unknown>): Promise<boolean> {
    this.savingState.set(true);
    this.errorState.set(null);

    try {
      const updated = await firstValueFrom(
        this.api.put<PlatformSettingsCategoryDto>(SETTINGS_API.category(categoryKey), payload),
      );
      this.categoriesState.update((items) =>
        items.map((item) => (item.key === categoryKey ? updated : item)),
      );
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to save settings.'));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  async restoreDefaults(categoryKey: string): Promise<boolean> {
    this.savingState.set(true);
    this.errorState.set(null);

    try {
      const updated = await firstValueFrom(
        this.api.post<PlatformSettingsCategoryDto>(SETTINGS_API.restore(categoryKey), {}),
      );
      this.categoriesState.update((items) =>
        items.map((item) => (item.key === categoryKey ? updated : item)),
      );
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to restore defaults.'));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  async testSmtp(testEmail: string): Promise<boolean> {
    this.savingState.set(true);
    this.errorState.set(null);

    try {
      await firstValueFrom(this.api.post<void>(SETTINGS_API.testEmail, { testEmail }));
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'SMTP test failed.'));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  private resolveError(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return fallback;
  }
}
