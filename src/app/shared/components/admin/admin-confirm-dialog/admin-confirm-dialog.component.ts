import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-admin-confirm-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, TranslatePipe],
  templateUrl: './admin-confirm-dialog.component.html',
  styleUrl: './admin-confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminConfirmDialogComponent {
  readonly visible = input(false);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('ADMIN.CONFIRM.CONFIRM');
  readonly cancelLabel = input('ADMIN.CONFIRM.CANCEL');
  readonly destructive = input(false);
  readonly loading = input(false);

  readonly visibleChange = output<boolean>();
  readonly confirmed = output<void>();

  protected onHide(): void {
    this.visibleChange.emit(false);
  }

  protected onConfirm(): void {
    this.confirmed.emit();
  }
}
