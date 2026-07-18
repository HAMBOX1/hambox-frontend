import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { WalletFacade } from '../../services/wallet.facade';

@Component({
  selector: 'app-wallet-card',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe, HamboxCurrencyPipe, DialogModule, EmptyStateComponent, LoadingSkeletonComponent],
  templateUrl: './wallet-card.component.html',
  styleUrl: './wallet-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletCardComponent implements OnInit {
  protected readonly facade = inject(WalletFacade);
  protected readonly historyOpen = signal(false);

  ngOnInit(): void {
    void this.facade.load();
  }

  protected openHistory(): void {
    this.historyOpen.set(true);
  }
}
