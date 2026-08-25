import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { MessageService } from 'primeng/api';

import { ButtonModule } from 'primeng/button';

import { TagModule } from 'primeng/tag';

import { ToastModule } from 'primeng/toast';



import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';

import { MembershipBenefitApiDto, MembershipPlanSummaryApiDto } from '../../models/account-membership-api.model';

import { AccountMembershipFacade } from '../../services/account-membership.facade';



const HISTORY_PAGE_SIZE = 8;
const BENEFIT_PREVIEW_COUNT = 3;



@Component({

  selector: 'app-account-membership-page',

  standalone: true,

  imports: [
    HamboxDatePipe,

    TranslatePipe,

    ButtonModule,

    TagModule,

    ToastModule,

    HamboxCurrencyPipe,

    HamboxTranslateRefreshDirective,

  ],

  providers: [MessageService],

  templateUrl: './account-membership-page.component.html',

  styleUrl: './account-membership-page.component.scss',

})

export class AccountMembershipPageComponent implements OnInit {

  private readonly facade = inject(AccountMembershipFacade);

  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);



  protected readonly loading = this.facade.loading;

  protected readonly error = this.facade.error;

  protected readonly actionLoading = this.facade.actionLoading;

  protected readonly subscription = this.facade.subscription;

  protected readonly benefits = this.facade.benefits;

  protected readonly availablePlans = this.facade.availablePlans;

  protected readonly history = this.facade.history;

  protected readonly transactions = this.facade.transactions;



  protected readonly historyPage = signal(1);

  protected readonly transactionsPage = signal(1);

  protected readonly activeBillingTab = signal<'history' | 'transactions'>('history');



  protected readonly currentPlanId = computed(() => this.subscription()?.planId ?? null);



  protected readonly comparablePlans = computed(() =>

    this.availablePlans().filter((plan) => plan.status === 'Active'),

  );



  protected readonly currentPlanBenefitsPreview = computed(() =>
    this.benefits().slice(0, BENEFIT_PREVIEW_COUNT),
  );

  protected readonly currentPlanBenefitsMoreCount = computed(() =>
    Math.max(0, this.benefits().length - BENEFIT_PREVIEW_COUNT),
  );



  protected readonly pagedHistory = computed(() => {

    const page = this.historyPage();

    const start = (page - 1) * HISTORY_PAGE_SIZE;

    return this.history().slice(start, start + HISTORY_PAGE_SIZE);

  });



  protected readonly pagedTransactions = computed(() => {

    const page = this.transactionsPage();

    const start = (page - 1) * HISTORY_PAGE_SIZE;

    return this.transactions().slice(start, start + HISTORY_PAGE_SIZE);

  });



  protected readonly historyPageCount = computed(() =>

    Math.max(1, Math.ceil(this.history().length / HISTORY_PAGE_SIZE)),

  );



  protected readonly transactionsPageCount = computed(() =>

    Math.max(1, Math.ceil(this.transactions().length / HISTORY_PAGE_SIZE)),

  );



  ngOnInit(): void {

    void this.facade.load();

  }



  protected retry(): void {

    void this.facade.load();

  }



  protected isCurrentPlan(planId: string): boolean {

    return this.currentPlanId() === planId;

  }



  protected planBenefitsPreview(plan: MembershipPlanSummaryApiDto): readonly MembershipBenefitApiDto[] {
    return plan.benefits.slice(0, BENEFIT_PREVIEW_COUNT);
  }

  protected planBenefitsMoreCount(plan: MembershipPlanSummaryApiDto): number {
    return Math.max(0, plan.benefits.length - BENEFIT_PREVIEW_COUNT);
  }

  protected setBillingTab(tab: 'history' | 'transactions'): void {
    this.activeBillingTab.set(tab);
  }



  protected planAction(plan: MembershipPlanSummaryApiDto): 'current' | 'upgrade' | 'downgrade' | 'subscribe' {

    const currentId = this.currentPlanId();

    if (!currentId) {

      return 'subscribe';

    }



    if (currentId === plan.id) {

      return 'current';

    }



    const current = this.availablePlans().find((item) => item.id === currentId);

    if (!current) {

      return 'subscribe';

    }



    return plan.sortOrder > current.sortOrder ? 'upgrade' : 'downgrade';

  }



  protected async renew(): Promise<void> {

    const success = await this.facade.renew();

    this.showActionResult(
      success,
      this.translate.instant('ACCOUNT.MEMBERSHIP_UI.TOAST.RENEW_SUCCESS'),
      this.translate.instant('ACCOUNT.MEMBERSHIP_UI.TOAST.RENEW_FAIL'),
    );

  }



  protected async upgrade(plan: MembershipPlanSummaryApiDto): Promise<void> {

    const success = await this.facade.upgrade(plan.id);

    this.showActionResult(
      success,
      this.translate.instant('ACCOUNT.MEMBERSHIP_UI.TOAST.UPGRADE_SUCCESS', { name: plan.name }),
      this.translate.instant('ACCOUNT.MEMBERSHIP_UI.TOAST.UPGRADE_FAIL'),
    );

  }



  protected async downgrade(plan: MembershipPlanSummaryApiDto): Promise<void> {

    const success = await this.facade.downgrade(plan.id);

    this.showActionResult(
      success,
      this.translate.instant('ACCOUNT.MEMBERSHIP_UI.TOAST.DOWNGRADE_SUCCESS', { name: plan.name }),
      this.translate.instant('ACCOUNT.MEMBERSHIP_UI.TOAST.DOWNGRADE_FAIL'),
    );

  }



  protected async subscribe(plan: MembershipPlanSummaryApiDto): Promise<void> {

    const success = await this.facade.subscribe(plan.id);

    this.showActionResult(
      success,
      this.translate.instant('ACCOUNT.MEMBERSHIP_UI.TOAST.SUBSCRIBE_SUCCESS', { name: plan.name }),
      this.translate.instant('ACCOUNT.MEMBERSHIP_UI.TOAST.SUBSCRIBE_FAIL'),
    );

  }



  protected setHistoryPage(page: number): void {

    this.historyPage.set(Math.min(Math.max(page, 1), this.historyPageCount()));

  }



  protected setTransactionsPage(page: number): void {

    this.transactionsPage.set(Math.min(Math.max(page, 1), this.transactionsPageCount()));

  }



  protected statusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {

    const normalized = status.toLowerCase();

    if (normalized.includes('active') || normalized.includes('paid') || normalized.includes('success')) {

      return 'success';

    }



    if (normalized.includes('pending')) {

      return 'warn';

    }



    if (normalized.includes('fail') || normalized.includes('cancel')) {

      return 'danger';

    }



    return 'info';

  }



  private showActionResult(success: boolean, successMsg: string, failMsg: string): void {

    if (success) {

      this.messageService.add({ severity: 'success', summary: successMsg, life: 4000 });

      return;

    }



    this.messageService.add({

      severity: 'error',

      summary: failMsg,

      detail: this.facade.error() ?? this.translate.instant('ACCOUNT.MEMBERSHIP_UI.TOAST.ACTION_FAILED'),

      life: 5000,

    });

  }

}

