import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../../shared/components/admin';
import { HamboxCurrencyPipe } from '../../../../../shared/pipes/hambox-currency.pipe';
import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { PromotionSummaryPanelComponent } from '../../components/promotion-summary-panel/promotion-summary-panel.component';
import { CouponCodeDto } from '../../models/promotion-api.model';
import { PromotionManagementFacade } from '../../services/promotion-management.facade';
import {
  couponRemaining,
  couponStatus,
  CouponStatus,
  discountWarning,
  promotionApplicabilityIssues,
  scopeLabelKey,
} from '../../utils/promotion-display.util';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';

const COUPON_STATUS_TONE: Record<CouponStatus, AdminStatusTone> = {
  active: 'success',
  expired: 'warning',
  exhausted: 'warning',
  inactive: 'neutral',
};

@Component({
  selector: 'app-promotion-detail-page',
  standalone: true,
  imports: [
    TranslatePipe,
    ButtonModule,
    TableModule,
    TabsModule,
    ToastModule,
    TooltipModule,
    HamboxCurrencyPipe,
    HamboxDatePipe,
    PromotionSummaryPanelComponent,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminSectionCardComponent,
    AdminStatusBadgeComponent,
    AdminActionMenuComponent,
    AdminStatGridComponent,
    AdminStatCardComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
  ],
  providers: [PromotionManagementFacade, MessageService],
  templateUrl: './promotion-detail-page.component.html',
  styleUrl: './promotion-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);
  protected readonly facade = inject(PromotionManagementFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly promotionId = signal<string | null>(null);
  protected readonly activeTab = signal('0');

  protected readonly detail = this.facade.detail;
  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailError = this.facade.detailError;
  protected readonly statistics = this.facade.statistics;
  protected readonly statisticsLoading = this.facade.statisticsLoading;
  protected readonly redemptions = this.facade.redemptions;
  protected readonly redemptionsLoading = this.facade.redemptionsLoading;
  protected readonly redemptionsTotal = this.facade.redemptionsTotal;
  protected readonly redemptionsPageSize = this.facade.redemptionsPageSize;
  protected readonly actionLoading = this.facade.actionLoading;

  protected readonly tableFirst = computed(
    () => (this.facade.redemptionsPage() - 1) * this.facade.redemptionsPageSize(),
  );

  protected readonly breadcrumbs = computed(() => {
    const promo = this.detail();
    return adminBreadcrumbs(
      {
        label: this.translate.instant('ADMIN.PROMOTIONS.LIST.TITLE'),
        route: '/admin/promotions',
      },
      { label: promo?.name ?? this.translate.instant('ADMIN.PROMOTIONS.DETAIL.TAB_OVERVIEW') },
    );
  });

  protected readonly scopeKey = computed(() => {
    const promo = this.detail();
    return promo ? scopeLabelKey(promo.type) : '';
  });

  protected readonly discountWarningKey = computed(() => {
    const promo = this.detail();
    return promo ? discountWarning(promo.discountType, promo.discountValue) : null;
  });

  protected readonly summaryData = computed(() => {
    const promo = this.detail();
    if (!promo) {
      return null;
    }
    return {
      name: promo.name,
      type: promo.type,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      startDateUtc: promo.startDateUtc,
      endDateUtc: promo.endDateUtc,
      conditions: promo.conditions,
      productTargetCount: promo.targets.filter((t) => t.type === 'Product').length,
      categoryTargetCount: promo.targets.filter((t) => t.type === 'Category').length,
      hasCoupon: promo.couponCodes.length > 0,
    };
  });

  // HAMBOX supports exactly one coupon code per Coupon promotion (see promotion-edit-page for the
  // create/duplicate workflow this pairs with) — the Overview shows that single code inline
  // instead of linking out to a coupon management screen.
  protected readonly singleCoupon = computed(() => this.detail()?.couponCodes[0] ?? null);

  /** Translation keys explaining why this promotion, as currently configured, can never apply —
   * empty means Publish/Activate is safe. Mirrors promotion-summary-panel's own check (same
   * shared pure function) so the Overview panel and the action buttons never disagree. */
  protected readonly applicabilityIssueKeys = computed(() => {
    const promo = this.detail();
    if (!promo) {
      return [];
    }
    return promotionApplicabilityIssues({
      type: promo.type,
      productTargetCount: promo.targets.filter((t) => t.type === 'Product').length,
      categoryTargetCount: promo.targets.filter((t) => t.type === 'Category').length,
      hasCoupon: promo.couponCodes.length > 0,
    });
  });

  protected readonly canApply = computed(() => this.applicabilityIssueKeys().length === 0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.promotionId.set(id);
    void this.facade.loadDetail(id);
    void this.facade.loadStatistics(id);
    this.facade.loadRedemptions(id);
  }

  protected onTabChange(value: string | number | undefined): void {
    this.activeTab.set(String(value ?? '0'));
  }

  protected onRedemptionsPageChange(event: TableLazyLoadEvent): void {
    const id = this.promotionId();
    if (!id) {
      return;
    }

    const rows = event.rows ?? this.facade.redemptionsPageSize();
    const first = event.first ?? 0;
    const pageNumber = Math.floor(first / rows) + 1;
    this.facade.setRedemptionsPage(pageNumber, rows, id);
  }

  /** Guards both the primary action button and the overflow menu item — belt-and-braces on top of
   * the disabled state, since a stale disabled binding should never be the only thing standing
   * between "Publish" and a promotion that can never apply. */
  private blockIfCannotApply(): boolean {
    if (this.canApply()) {
      return false;
    }
    this.messageService.add({
      severity: 'warn',
      summary: this.translate.instant('ADMIN.PROMOTIONS.DETAIL.CANNOT_PUBLISH_TITLE'),
      detail: this.translate.instant(this.applicabilityIssueKeys()[0]),
      life: 6000,
    });
    return true;
  }

  protected async publish(): Promise<void> {
    const id = this.promotionId();
    if (!id || this.blockIfCannotApply()) {
      return;
    }

    const success = await this.facade.publishPromotion(id);
    if (success) {
      await this.facade.loadDetail(id);
      this.messageService.add({ severity: 'success', summary: 'Promotion published', life: 4000 });
    }
  }

  protected async activate(): Promise<void> {
    const id = this.promotionId();
    if (!id || this.blockIfCannotApply()) {
      return;
    }

    const success = await this.facade.activatePromotion(id);
    if (success) {
      await this.facade.loadDetail(id);
      this.messageService.add({ severity: 'success', summary: 'Promotion activated', life: 4000 });
    }
  }

  protected async deactivate(): Promise<void> {
    const id = this.promotionId();
    if (!id) {
      return;
    }

    const success = await this.facade.deactivatePromotion(id);
    if (success) {
      await this.facade.loadDetail(id);
      this.messageService.add({ severity: 'success', summary: 'Promotion deactivated', life: 4000 });
    }
  }

  protected retryDetail(): void {
    const id = this.promotionId();
    if (id) {
      void this.facade.loadDetail(id);
    }
  }

  protected couponStatusTone(coupon: CouponCodeDto): AdminStatusTone {
    return COUPON_STATUS_TONE[couponStatus(coupon)];
  }

  protected couponStatusLabel(coupon: CouponCodeDto): string {
    return this.translate.instant(`ADMIN.PROMOTIONS.COUPONS.STATUS.${couponStatus(coupon).toUpperCase()}`);
  }

  protected couponRemainingLabel(coupon: CouponCodeDto): string {
    const remaining = couponRemaining(coupon);
    return remaining === null ? this.translate.instant('ADMIN.PROMOTIONS.COUPONS.UNLIMITED') : String(remaining);
  }

  protected goToEdit(promotionId: string): void {
    void this.router.navigate(['/admin/promotions', promotionId, 'edit']);
  }

  protected async copyCouponCode(code: string): Promise<void> {
    await navigator.clipboard.writeText(code);
    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant('ADMIN.PROMOTIONS.COUPONS.COPIED'),
      life: 2500,
    });
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Draft':
        return 'info';
      case 'Inactive':
        return 'warning';
      case 'Archived':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected primaryActionLabel(status: string): string | null {
    switch (status) {
      case 'Draft':
        return this.translate.instant('ADMIN.PROMOTIONS.ACTIONS.PUBLISH');
      case 'Inactive':
        return this.translate.instant('ADMIN.PROMOTIONS.ACTIONS.ACTIVATE');
      case 'Active':
        return this.translate.instant('ADMIN.PROMOTIONS.ACTIONS.DEACTIVATE');
      default:
        return null;
    }
  }

  protected primaryActionIcon(status: string): string {
    switch (status) {
      case 'Draft':
        return 'pi pi-send';
      case 'Inactive':
        return 'pi pi-play';
      case 'Active':
        return 'pi pi-pause';
      default:
        return 'pi pi-check';
    }
  }

  protected primaryActionSeverity(status: string): 'success' | 'warn' | undefined {
    if (status === 'Active') {
      return 'warn';
    }
    if (status === 'Inactive') {
      return 'success';
    }
    return undefined;
  }

  protected async runPrimaryAction(status: string): Promise<void> {
    switch (status) {
      case 'Draft':
        await this.publish();
        break;
      case 'Inactive':
        await this.activate();
        break;
      case 'Active':
        await this.deactivate();
        break;
    }
  }

  protected canPublish(): boolean {
    return this.permissionService.hasPermission(this.permissions.Promotions.Publish);
  }

  /** True only when the primary action would make the promotion live (Draft→Publish,
   * Inactive→Activate) and it's currently unable to ever apply. Deactivate is never blocked. */
  protected primaryActionBlocked(status: string): boolean {
    return (status === 'Draft' || status === 'Inactive') && !this.canApply();
  }

  protected overflowMenuItems(promo: { id: string; status: string }): MenuItem[] {
    const items: MenuItem[] = [];
    const t = (key: string) => this.translate.instant(key);

    if (this.permissionService.hasPermission(this.permissions.Promotions.Edit)) {
      items.push({
        label: t('ADMIN.PROMOTIONS.ACTIONS.EDIT'),
        icon: 'pi pi-pencil',
        routerLink: ['/admin/promotions', promo.id, 'edit'],
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Promotions.Publish)) {
      if (promo.status !== 'Draft') {
        items.push({
          label: t('ADMIN.PROMOTIONS.ACTIONS.PUBLISH'),
          icon: 'pi pi-send',
          disabled: this.actionLoading() || promo.status === 'Active' || !this.canApply(),
          command: () => void this.publish(),
        });
      }
      if (promo.status !== 'Inactive') {
        items.push({
          label: t('ADMIN.PROMOTIONS.ACTIONS.ACTIVATE'),
          icon: 'pi pi-play',
          disabled: this.actionLoading() || !this.canApply(),
          command: () => void this.activate(),
        });
      }
      if (promo.status !== 'Active') {
        items.push({
          label: t('ADMIN.PROMOTIONS.ACTIONS.DEACTIVATE'),
          icon: 'pi pi-pause',
          disabled: this.actionLoading(),
          command: () => void this.deactivate(),
        });
      }
    }

    return items;
  }
}
