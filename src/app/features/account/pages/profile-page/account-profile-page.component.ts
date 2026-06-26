import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AccountProfileFacade } from '../../services/account-profile.facade';

@Component({
  selector: 'app-account-profile-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './account-profile-page.component.html',
  styleUrl: './account-profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfilePageComponent implements OnInit {
  private readonly facade = inject(AccountProfileFacade);

  protected readonly profile = this.facade.profile;
  protected readonly loading = this.facade.loading;
  protected readonly saving = this.facade.saving;
  protected readonly error = this.facade.error;
  protected readonly success = this.facade.success;

  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly phoneNumber = signal('');
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');

  ngOnInit(): void {
    void this.loadProfile();
  }

  protected async loadProfile(): Promise<void> {
    await this.facade.load();
    const profile = this.profile();
    if (profile) {
      this.firstName.set(profile.firstName);
      this.lastName.set(profile.lastName);
      this.phoneNumber.set(profile.phoneNumber ?? '');
    }
  }

  protected async saveProfile(): Promise<void> {
    await this.facade.saveProfile(
      this.firstName().trim(),
      this.lastName().trim(),
      this.phoneNumber().trim() || null,
    );
  }

  protected async changePassword(): Promise<void> {
    const ok = await this.facade.changePassword(this.currentPassword(), this.newPassword());
    if (ok) {
      this.currentPassword.set('');
      this.newPassword.set('');
    }
  }
}
