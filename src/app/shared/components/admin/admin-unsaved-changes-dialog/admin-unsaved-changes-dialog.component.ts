import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-admin-unsaved-changes-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, TranslatePipe],
  templateUrl: './admin-unsaved-changes-dialog.component.html',
  styleUrl: './admin-unsaved-changes-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUnsavedChangesDialogComponent {
  readonly visible = input(false);
  readonly title = input('ADMIN.UNSAVED.TITLE');
  readonly message = input('ADMIN.UNSAVED.MESSAGE');
  readonly saveLabel = input('ADMIN.UNSAVED.SAVE');
  readonly discardLabel = input('ADMIN.UNSAVED.DISCARD');
  readonly cancelLabel = input('ADMIN.CONFIRM.CANCEL');
  readonly saving = input(false);

  readonly visibleChange = output<boolean>();
  readonly save = output<void>();
  readonly discard = output<void>();

  protected onHide(): void {
    this.visibleChange.emit(false);
  }

  protected onSave(): void {
    this.save.emit();
  }

  protected onDiscard(): void {
    this.discard.emit();
  }
}
