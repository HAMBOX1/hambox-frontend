import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { ReportPeriodPreset } from '../../models/reports-api.model';
import { ReportsFacade } from '../../services/reports.facade';

@Component({
  selector: 'app-reports-filters',
  standalone: true,
  imports: [FormsModule, TranslatePipe, InputTextModule, SelectModule],
  templateUrl: './reports-filters.component.html',
  styleUrl: './reports-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsFiltersComponent {
  private readonly facade = inject(ReportsFacade);

  protected readonly filters = this.facade.filters;

  protected readonly presetOptions: { labelKey: string; value: ReportPeriodPreset }[] = [
    { labelKey: 'ADMIN.REPORTS.FILTERS.PRESET_TODAY', value: 'Today' },
    { labelKey: 'ADMIN.REPORTS.FILTERS.PRESET_YESTERDAY', value: 'Yesterday' },
    { labelKey: 'ADMIN.REPORTS.FILTERS.PRESET_LAST7', value: 'Last7' },
    { labelKey: 'ADMIN.REPORTS.FILTERS.PRESET_LAST30', value: 'Last30' },
    { labelKey: 'ADMIN.REPORTS.FILTERS.PRESET_LAST90', value: 'Last90' },
    { labelKey: 'ADMIN.REPORTS.FILTERS.PRESET_THIS_MONTH', value: 'ThisMonth' },
    { labelKey: 'ADMIN.REPORTS.FILTERS.PRESET_THIS_YEAR', value: 'ThisYear' },
    { labelKey: 'ADMIN.REPORTS.FILTERS.PRESET_CUSTOM', value: 'Custom' },
  ];

  protected onPresetChange(preset: ReportPeriodPreset): void {
    this.facade.setFilters({
      preset,
      from: preset === 'Custom' ? this.filters().from : null,
      to: preset === 'Custom' ? this.filters().to : null,
    });
  }

  protected onFromChange(from: string): void {
    this.facade.setFilters({ from: from || null });
  }

  protected onToChange(to: string): void {
    this.facade.setFilters({ to: to || null });
  }
}