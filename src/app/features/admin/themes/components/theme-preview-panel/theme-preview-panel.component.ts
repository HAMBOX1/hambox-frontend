import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

import { AdminSectionCardComponent } from '../../../../../shared/components/admin';

@Component({
  selector: 'app-theme-preview-panel',
  standalone: true,
  imports: [TranslatePipe, ButtonModule, AdminSectionCardComponent],
  templateUrl: './theme-preview-panel.component.html',
  styleUrl: './theme-preview-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemePreviewPanelComponent {
  readonly themeName = input('');
  readonly baseMode = input('Dark');
}
