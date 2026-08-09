import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminEmptyStateComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { ScheduleThemeRequest, ThemeScheduleDto } from '../../models/theme-api.model';

@Component({
  selector: 'app-theme-scheduler-panel',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TooltipModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminEmptyStateComponent,
  ],
  templateUrl: './theme-scheduler-panel.component.html',
  styleUrl: './theme-scheduler-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSchedulerPanelComponent {
  readonly schedules = input<readonly ThemeScheduleDto[]>([]);
  readonly loading = input(false);
  readonly actionLoading = input(false);

  readonly schedule = output<ScheduleThemeRequest>();

  protected readonly permissions = PERMISSIONS;
  protected readonly startsAt = signal('');
  protected readonly endsAt = signal('');
  protected readonly recurrenceRule = signal('');
  protected readonly priority = signal(0);

  protected readonly hasOverlapWarning = computed(() => this.schedules().some((s) => s.hasOverlap));

  protected submitSchedule(): void {
    if (!this.startsAt()) {
      return;
    }

    this.schedule.emit({
      startsAtUtc: new Date(this.startsAt()).toISOString(),
      endsAtUtc: this.endsAt() ? new Date(this.endsAt()).toISOString() : null,
      recurrenceRule: this.recurrenceRule().trim() || null,
      priority: this.priority(),
    });

    this.startsAt.set('');
    this.endsAt.set('');
    this.recurrenceRule.set('');
    this.priority.set(0);
  }
}
