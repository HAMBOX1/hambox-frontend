import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import {
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import { ReportsFacade } from '../../services/reports.facade';

@Component({
  selector: 'app-reports-downloads-page',
  standalone: true,
  imports: [
    DatePipe,
    TranslatePipe,
    ButtonModule,
    TableModule,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminEmptyStateComponent,
  ],
  templateUrl: './reports-downloads-page.component.html',
  styleUrl: './reports-downloads-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsDownloadsPageComponent implements OnInit {
  private readonly facade = inject(ReportsFacade);

  protected readonly downloads = this.facade.downloads;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  ngOnInit(): void {
    void this.reload();
  }

  protected reload(): void {
    void this.facade.loadDownloads();
  }

  protected formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}