import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStickySaveBarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { BenefitsConfigPanelComponent } from '../../components/benefits-config-panel/benefits-config-panel.component';
import {
  CreateMembershipPlanRequest,
  MembershipBenefitDto,
  UpdateMembershipPlanRequest,
} from '../../models/membership-api.model';
import { MembershipManagementFacade } from '../../services/membership-management.facade';

@Component({
  selector: 'app-membership-edit-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStickySaveBarComponent,
    BenefitsConfigPanelComponent,
  ],
  providers: [MembershipManagementFacade, MessageService],
  templateUrl: './membership-edit-page.component.html',
  styleUrl: './membership-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipEditPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(MembershipManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;

  protected readonly planId = signal<string | null>(null);
  protected readonly isCreateMode = computed(() => this.planId() === null);

  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      {
        label: this.translate.instant('ADMIN.MEMBERSHIPS.LIST.TITLE'),
        route: '/admin/memberships',
      },
      {
        label: this.translate.instant(
          this.isCreateMode()
            ? 'ADMIN.MEMBERSHIPS.EDIT.CREATE_TITLE'
            : 'ADMIN.MEMBERSHIPS.EDIT.EDIT_TITLE',
        ),
      },
    ),
  );

  protected readonly name = signal('');
  protected readonly slug = signal('');
  protected readonly description = signal('');
  protected readonly price = signal(0);
  protected readonly durationDays = signal(30);
  protected readonly sortOrder = signal(0);
  protected readonly badgeLabel = signal('');
  protected readonly themeKey = signal('');
  protected readonly isDefault = signal(false);
  protected readonly benefits = signal<MembershipBenefitDto[]>([]);

  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailSaving = this.facade.detailSaving;
  protected readonly detailError = this.facade.detailError;

  constructor() {
    effect(() => {
      const detail = this.facade.detail();
      if (!detail || this.isCreateMode()) {
        return;
      }

      this.name.set(detail.name);
      this.slug.set(detail.slug);
      this.description.set(detail.description ?? '');
      this.price.set(detail.price);
      this.durationDays.set(detail.durationDays);
      this.sortOrder.set(detail.sortOrder);
      this.badgeLabel.set(detail.badgeLabel ?? '');
      this.themeKey.set(detail.themeKey ?? '');
      this.isDefault.set(detail.isDefault);
      this.benefits.set(detail.benefits.map((benefit) => ({ ...benefit })));
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.planId.set(id);
      void this.facade.loadDetail(id);
      return;
    }

    this.facade.resetDetail();
  }

  protected onNameInput(value: string): void {
    this.name.set(value);
    if (this.isCreateMode() && !this.slug().trim()) {
      this.slug.set(this.slugify(value));
    }
  }

  protected async save(): Promise<void> {
    const payload = {
      name: this.name().trim(),
      slug: this.slug().trim().toLowerCase(),
      description: this.description().trim() || null,
      price: this.price(),
      durationDays: this.durationDays(),
      sortOrder: this.sortOrder(),
      badgeLabel: this.badgeLabel().trim() || null,
      themeKey: this.themeKey().trim() || null,
      isDefault: this.isDefault(),
      benefits: this.benefits(),
    };

    if (!payload.name || !payload.slug) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Name and slug are required.',
        life: 4000,
      });
      return;
    }

    const planId = this.planId();
    if (planId) {
      const request: UpdateMembershipPlanRequest = payload;
      const success = await this.facade.updatePlan(planId, request);
      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Plan saved',
          life: 4000,
        });
        void this.router.navigate(['/admin/memberships', planId]);
      }
      return;
    }

    const request: CreateMembershipPlanRequest = payload;
    const createdId = await this.facade.createPlan(request);
    if (createdId) {
      this.messageService.add({
        severity: 'success',
        summary: 'Plan created',
        life: 4000,
      });
      void this.router.navigate(['/admin/memberships', createdId]);
    }
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
