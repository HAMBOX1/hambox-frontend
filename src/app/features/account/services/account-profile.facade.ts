import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { parseApiError } from '../../../core/models/api-error.model';
import { UserProfileApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';

@Injectable({
  providedIn: 'root',
})
export class AccountProfileFacade {
  private readonly api = inject(AccountApiService);
  private readonly translate = inject(TranslateService);

  private readonly profileState = signal<UserProfileApiDto | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  /** The profile could not be loaded: the only case that replaces the page. */
  private readonly errorState = signal<string | null>(null);
  /** A save / password change failed: shown inline so the form stays and can be corrected and retried. */
  private readonly actionErrorState = signal<string | null>(null);
  private readonly successState = signal<string | null>(null);

  readonly profile = this.profileState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly actionError = this.actionErrorState.asReadonly();
  readonly success = this.successState.asReadonly();

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const profile = await firstValueFrom(this.api.getProfile());
      this.profileState.set(profile);
    } catch {
      this.profileState.set(null);
      this.errorState.set(this.translate.instant('ACCOUNT.PROFILE_UI.LOAD_FAILED'));
    } finally {
      this.loadingState.set(false);
    }
  }

  async saveProfile(firstName: string, lastName: string, phoneNumber: string | null): Promise<boolean> {
    this.savingState.set(true);
    this.actionErrorState.set(null);
    this.successState.set(null);

    try {
      const profile = await firstValueFrom(
        this.api.updateProfile({ firstName, lastName, phoneNumber }),
      );
      this.profileState.set(profile);
      this.successState.set(this.translate.instant('ACCOUNT.PROFILE_UI.UPDATED'));
      return true;
    } catch (error) {
      this.actionErrorState.set(this.messageFor(error, 'ACCOUNT.PROFILE_UI.SAVE_FAILED'));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    this.savingState.set(true);
    this.actionErrorState.set(null);
    this.successState.set(null);

    try {
      await firstValueFrom(this.api.changePassword({ currentPassword, newPassword }));
      this.successState.set(this.translate.instant('ACCOUNT.PROFILE_UI.PASSWORD_CHANGED'));
      return true;
    } catch (error) {
      this.actionErrorState.set(this.messageFor(error, 'ACCOUNT.PROFILE_UI.PASSWORD_FAILED'));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  /** The server's own reason (e.g. "Phone number is not valid.") when it gave one; a generic message otherwise. */
  private messageFor(error: unknown, fallbackKey: string): string {
    const parsed = parseApiError(error);
    return parsed.code.startsWith('Http.') || parsed.code === 'Client.UnknownError'
      ? this.translate.instant(fallbackKey)
      : parsed.message;
  }
}
