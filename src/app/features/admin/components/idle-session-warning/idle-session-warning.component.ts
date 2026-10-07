import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { IdleSessionService } from '../../../../core/auth/idle-session.service';

/**
 * The idle-timeout warning modal — deliberately NOT built on `AdminConfirmDialogComponent`: that
 * component treats the backdrop/Escape/X-button dismiss the same as its "cancel" action, which is
 * the right default for "cancel a destructive action" but wrong here (accidentally clicking
 * outside this dialog must never silently sign the admin out). `closable`/`dismissableMask` are
 * hardcoded off so only the two explicit buttons can resolve it.
 */
@Component({
  selector: 'app-idle-session-warning',
  standalone: true,
  imports: [DialogModule, ButtonModule, TranslatePipe],
  templateUrl: './idle-session-warning.component.html',
  styleUrl: './idle-session-warning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdleSessionWarningComponent {
  protected readonly idleSession = inject(IdleSessionService);

  protected stayActive(): void {
    void this.idleSession.stayActive();
  }

  protected signOut(): void {
    void this.idleSession.signOutNow();
  }
}
