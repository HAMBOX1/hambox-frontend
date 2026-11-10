import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';
import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';

import { Auth } from '../../../auth/services/auth';
import { AccountProfileFacade } from '../../services/account-profile.facade';

@Component({
  selector: 'app-account-profile-page',
  standalone: true,
  imports: [FormsModule, HamboxDatePipe, TranslatePipe, HamboxTranslateRefreshDirective],
  templateUrl: './account-profile-page.component.html',
  styleUrl: './account-profile-page.component.scss',
})
export class AccountProfilePageComponent implements OnInit {
  private readonly facade = inject(AccountProfileFacade);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  protected readonly profile = this.facade.profile;
  protected readonly loading = this.facade.loading;
  protected readonly saving = this.facade.saving;
  protected readonly error = this.facade.error;
  protected readonly actionError = this.facade.actionError;
  protected readonly success = this.facade.success;
  /** Client-side check shown before anything is sent. */
  protected readonly formError = signal<string | null>(null);

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
    if (!this.firstName().trim() || !this.lastName().trim()) {
      this.formError.set(this.translate.instant('ACCOUNT.PROFILE_UI.NAME_REQUIRED'));
      return;
    }
    this.formError.set(null);
    await this.facade.saveProfile(
      this.firstName().trim(),
      this.lastName().trim(),
      this.phoneNumber().trim() || null,
    );
  }

  protected async changePassword(): Promise<void> {
    if (!this.currentPassword() || !this.newPassword()) {
      this.formError.set(this.translate.instant('ACCOUNT.PROFILE_UI.PASSWORDS_REQUIRED'));
      return;
    }
    this.formError.set(null);
    const ok = await this.facade.changePassword(this.currentPassword(), this.newPassword());
    if (ok) {
      this.currentPassword.set('');
      this.newPassword.set('');
      // Changing the password ends every session server-side, so finish the sign-out here instead of leaving
      // a page whose next request would fail.
      setTimeout(() => this.auth.logout().subscribe(() => void this.router.navigate(['/auth/login'])), 1500);
    }
  }
}
