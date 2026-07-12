import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import {
  AnalyticsComparisonMode,
  AnalyticsExportFormat,
  AnalyticsPeriodPreset,
} from '../../models/analytics-api.model';
import { AnalyticsFacade } from '../../services/analytics.facade';

@Component({
  selector: 'app-analytics-filters',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    SelectModule,
    MenuModule,
    HasPermissionDirective,
  ],
  templateUrl: './analytics-filters.component.html',
  styleUrl: './analytics-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsFiltersComponent {
  private readonly facade = inject(AnalyticsFacade);
  private readonly exportMenu = viewChild<Menu>('exportMenu');

  protected readonly permissions = PERMISSIONS;
  protected readonly filters = this.facade.filters;
  protected readonly loading = this.facade.loading;
  protected readonly exporting = this.facade.exporting;

  protected readonly presetOptions: { labelKey: string; value: AnalyticsPeriodPreset }[] = [
    { labelKey: 'ADMIN.ANALYTICS.FILTERS.PRESET_TODAY', value: 'Today' },
    { labelKey: 'ADMIN.ANALYTICS.FILTERS.PRESET_YESTERDAY', value: 'Yesterday' },
    { labelKey: 'ADMIN.ANALYTICS.FILTERS.PRESET_LAST7', value: 'Last7' },
    { labelKey: 'ADMIN.ANALYTICS.FILTERS.PRESET_LAST30', value: 'Last30' },
    { labelKey: 'ADMIN.ANALYTICS.FILTERS.PRESET_LAST90', value: 'Last90' },
    { labelKey: 'ADMIN.ANALYTICS.FILTERS.PRESET_THIS_MONTH', value: 'ThisMonth' },
    { labelKey: 'ADMIN.ANALYTICS.FILTERS.PRESET_THIS_YEAR', value: 'ThisYear' },
    { labelKey: 'ADMIN.ANALYTICS.FILTERS.PRESET_CUSTOM', value: 'Custom' },
  ];

  protected readonly compareOptions: { labelKey: string; value: AnalyticsComparisonMode }[] = [
    { labelKey: 'ADMIN.ANALYTICS.FILTERS.COMPARE_NONE', value: 'None' },
    { labelKey: 'ADMIN.ANALYTICS.FILTERS.COMPARE_PREVIOUS_PERIOD', value: 'PreviousPeriod' },
    { labelKey: 'ADMIN.ANALYTICS.FILTERS.COMPARE_PREVIOUS_MONTH', value: 'PreviousMonth' },
    { labelKey: 'ADMIN.ANALYTICS.FILTERS.COMPARE_PREVIOUS_YEAR', value: 'PreviousYear' },
  ];

  protected readonly exportItems: MenuItem[] = [
    {
      label: 'CSV',
      command: () => void this.export('csv'),
    },
    {
      label: 'Excel',
      command: () => void this.export('excel'),
    },
    {
      label: 'JSON',
      command: () => void this.export('json'),
    },
    {
      label: 'PDF',
      command: () => void this.export('pdf'),
    },
  ];

  protected onPresetChange(preset: AnalyticsPeriodPreset): void {
    this.facade.setFilters({
      preset,
      from: preset === 'Custom' ? this.filters().from : null,
      to: preset === 'Custom' ? this.filters().to : null,
    });
  }

  protected onCompareChange(compare: AnalyticsComparisonMode): void {
    this.facade.setFilters({ compare });
  }

  protected onFromChange(from: string): void {
    this.facade.setFilters({ from: from || null });
  }

  protected onToChange(to: string): void {
    this.facade.setFilters({ to: to || null });
  }

  protected refresh(): void {
    void this.facade.refreshCurrent();
  }

  protected toggleExport(event: Event): void {
    this.exportMenu()?.toggle(event);
  }

  private export(format: AnalyticsExportFormat): void {
    void this.facade.exportSection(this.facade.currentSection(), format);
  }
}