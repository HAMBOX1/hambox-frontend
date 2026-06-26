import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { UserProfileApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';

@Injectable({
  providedIn: 'root',
})
export class AccountProfileFacade {
  private readonly api = inject(AccountApiService);

  private readonly profileState = signal<UserProfileApiDto | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly successState = signal<string | null>(null);

  readonly profile = this.profileState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly success = this.successState.asReadonly();

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const profile = await firstValueFrom(this.api.getProfile());
      this.profileState.set(profile);
    } catch {
      this.profileState.set(null);
      this.errorState.set('Unable to load profile.');
    } finally {
      this.loadingState.set(false);
    }
  }

  async saveProfile(firstName: string, lastName: string, phoneNumber: string | null): Promise<boolean> {
    this.savingState.set(true);
    this.errorState.set(null);
    this.successState.set(null);

    try {
      const profile = await firstValueFrom(
        this.api.updateProfile({ firstName, lastName, phoneNumber }),
      );
      this.profileState.set(profile);
      this.successState.set('Profile updated successfully.');
      return true;
    } catch {
      this.errorState.set('Unable to update profile.');
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    this.savingState.set(true);
    this.errorState.set(null);
    this.successState.set(null);

    try {
      await firstValueFrom(this.api.changePassword({ currentPassword, newPassword }));
      this.successState.set('Password changed successfully.');
      return true;
    } catch {
      this.errorState.set('Unable to change password. Check your current password.');
      return false;
    } finally {
      this.savingState.set(false);
    }
  }
}
