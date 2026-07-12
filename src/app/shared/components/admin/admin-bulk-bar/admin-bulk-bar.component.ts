import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-admin-bulk-bar',
  standalone: true,
  imports: [ButtonModule, TranslatePipe],
  templateUrl: './admin-bulk-bar.component.html',
  styleUrl: './admin-bulk-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBulkBarComponent {
  readonly selectedCount = input(0);
  readonly clearLabel = input('ADMIN.BULK.CLEAR');

  readonly clearSelection = output<void>();

  protected onClear(): void {
    this.clearSelection.emit();
  }
}
