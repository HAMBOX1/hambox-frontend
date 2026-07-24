import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminEmptyStateComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { MembershipManagementFacade } from '../../../memberships/services/membership-management.facade';
import {
  AssignThemeRequest,
  THEME_ASSIGNMENT_TYPE_OPTIONS,
  ThemeAssignmentDto,
} from '../../models/theme-api.model';

@Component({
  selector: 'app-theme-assignments-panel',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminEmptyStateComponent,
  ],
  providers: [MembershipManagementFacade],
  templateUrl: './theme-assignments-panel.component.html',
  styleUrl: './theme-assignments-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeAssignmentsPanelComponent implements OnInit {
  private readonly membershipFacade = inject(MembershipManagementFacade);

  readonly assignments = input<readonly ThemeAssignmentDto[]>([]);
  readonly actionLoading = input(false);

  readonly assign = output<AssignThemeRequest>();

  protected readonly permissions = PERMISSIONS;
  protected readonly assignmentTypeOptions = [...THEME_ASSIGNMENT_TYPE_OPTIONS];
  protected readonly assignmentType = signal('Store');
  protected readonly targetKey = signal('');
  protected readonly priority = signal(0);

  protected readonly membershipPlans = this.membershipFacade.plans;
  protected readonly membershipOptions = computed(() =>
    this.membershipPlans().map((plan) => ({ label: plan.name, value: plan.slug })),
  );
  protected readonly isMembershipAssignment = computed(() => this.assignmentType() === 'Membership');

  ngOnInit(): void {
    this.membershipFacade.loadPlans();
  }

  protected submitAssignment(): void {
    if (!this.targetKey().trim()) {
      return;
    }

    this.assign.emit({
      assignmentType: this.assignmentType(),
      targetKey: this.targetKey().trim(),
      priority: this.priority(),
    });

    this.targetKey.set('');
    this.priority.set(0);
  }
}
