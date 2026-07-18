import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { WalletApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';

@Injectable({
  providedIn: 'root',
})
export class WalletFacade {
  private readonly api = inject(AccountApiService);

  private readonly walletState = signal<WalletApiDto | null>(null);
  private readonly loadingState = signal(false);

  readonly wallet = this.walletState.asReadonly();
  readonly loading = this.loadingState.asReadonly();

  async load(): Promise<void> {
    this.loadingState.set(true);

    try {
      this.walletState.set(await firstValueFrom(this.api.getWallet()));
    } finally {
      this.loadingState.set(false);
    }
  }
}
