import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';

import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import { ThemeHistoryEntryDto } from '../../models/theme-api.model';

@Component({
  selector: 'app-theme-history-panel',
  standalone: true,
  imports: [
    DatePipe,
    TranslatePipe,
    TableModule,
    AdminSectionCardComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
  ],
  templateUrl: './theme-history-panel.component.html',
  styleUrl: './theme-history-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeHistoryPanelComponent {
  readonly history = input<readonly ThemeHistoryEntryDto[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  readonly retryLoad = output<void>();
}
