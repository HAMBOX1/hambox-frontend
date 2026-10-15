import {

  ChangeDetectionStrategy,

  Component,

  computed,

  inject,

  OnInit,

  signal,

} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { ActivatedRoute, RouterLink } from '@angular/router';

import { CurrencyPipe, DatePipe } from '@angular/common';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { MenuItem, MessageService } from 'primeng/api';

import { ButtonModule } from 'primeng/button';

import { DialogModule } from 'primeng/dialog';

import { InputTextModule } from 'primeng/inputtext';

import { SelectModule } from 'primeng/select';

import { TableModule } from 'primeng/table';

import { TextareaModule } from 'primeng/textarea';

import { ToastModule } from 'primeng/toast';



import { CurrencyService } from '../../../../../core/currency/currency.service';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';

import {

  AdminActionMenuComponent,

  AdminConfirmDialogComponent,

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

import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';

import { HamboxCurrencyPipe } from '../../../../../shared/pipes/hambox-currency.pipe';

import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';

import { AdminOrderDetailDto, AdminOrderItemDto, ORDER_STATUS_OPTIONS } from '../../models/order-api.model';

import { OrderManagementFacade } from '../../services/order-management.facade';
import { exportOrderLogToCsv } from '../../utils/order-export.util';



@Component({

  selector: 'app-order-detail-page',

  standalone: true,

  imports: [

    FormsModule,

    RouterLink,

    DatePipe,

    CurrencyPipe,

    TranslatePipe,

    ButtonModule,

    DialogModule,

    InputTextModule,

    SelectModule,

    TableModule,

    TextareaModule,

    ToastModule,

    HasPermissionDirective,

    HamboxCurrencyPipe,

    AdminPageHeaderComponent,

    AdminStatGridComponent,

    AdminStatCardComponent,

    AdminSectionCardComponent,

    AdminStatusBadgeComponent,

    AdminErrorAlertComponent,

    AdminLoadingSkeletonComponent,

    AdminEmptyStateComponent,

    AdminConfirmDialogComponent,

    AdminActionMenuComponent,

  ],

  providers: [OrderManagementFacade, MessageService],

  templateUrl: './order-detail-page.component.html',

  styleUrl: './order-detail-page.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class OrderDetailPageComponent implements OnInit {

  private readonly facade = inject(OrderManagementFacade);

  private readonly route = inject(ActivatedRoute);

  private readonly messageService = inject(MessageService);

  private readonly translate = inject(TranslateService);

  private readonly currencyService = inject(CurrencyService);

  private readonly permissionService = inject(PermissionService);



  protected readonly permissions = PERMISSIONS;

  protected readonly statusOptions = ORDER_STATUS_OPTIONS.filter((o) => o.value !== 'all');



  protected readonly detail = this.facade.detail;

  protected readonly detailLoading = this.facade.detailLoading;

  protected readonly detailError = this.facade.detailError;

  protected readonly actionLoading = this.facade.actionLoading;



  protected readonly orderId = computed(() => this.route.snapshot.paramMap.get('id') ?? '');

  protected readonly breadcrumbs = computed(() =>

    adminBreadcrumbs(

      { label: 'Orders', route: '/admin/orders' },

      { label: this.detail()?.orderNumber ?? 'Order', route: null },

    ),

  );



  protected readonly statusDialogOpen = signal(false);

  protected readonly refundDialogOpen = signal(false);

  protected readonly resendDialogOpen = signal(false);

  protected readonly retryDialogOpen = signal(false);

  protected readonly manualCodeDialogOpen = signal(false);

  protected readonly selectedStatus = signal('Completed');

  protected readonly noteBody = signal('');

  protected readonly editingNoteId = signal<string | null>(null);

  protected readonly revealedKeys = signal<Record<string, string>>({});

  protected readonly manualCodeItemId = signal<string | null>(null);

  protected readonly manualCodeValue = signal('');

  /** Every manual action on an order needs a reason; one field is shared by the dialogs (only one is open at a time). */
  protected readonly actionReason = signal('');
  protected readonly markDeliveredDialogOpen = signal(false);
  protected readonly deliveryEvidence = signal('');
  protected readonly contactDialogOpen = signal(false);
  protected readonly contactSubject = signal('');
  protected readonly contactMessage = signal('');



  protected readonly itemsNeedingCodes = computed(() => {

    const order = this.detail();

    if (!order) return [] as AdminOrderItemDto[];

    return order.items.filter((item) => item.deliveredCodesCount < item.quantity);

  });



  protected readonly manualCodeItemOptions = computed(() =>

    this.itemsNeedingCodes().map((item) => ({

      label: `${item.productName} (${item.deliveredCodesCount}/${item.quantity})`,

      value: item.id,

    })),

  );



  protected readonly canRetryFulfillment = computed(() => {

    const order = this.detail();

    if (!order) return false;

    return (

      order.paymentStatus === 'Paid' &&

      order.orderStatus !== 'Cancelled' &&

      order.orderStatus !== 'Refunded' &&

      order.deliveryStatus !== 'Delivered' &&

      this.itemsNeedingCodes().length > 0

    );

  });



  ngOnInit(): void {

    const id = this.orderId();

    if (id) {

      void this.facade.loadDetail(id);

    }

  }



  protected reloadDetail(): void {

    const id = this.orderId();

    if (id) {

      void this.facade.loadDetail(id);

    }

  }



  protected statusTone(status: string): AdminStatusTone {

    switch (status) {

      case 'Completed':

      case 'Delivered':

      case 'Paid':

        return 'success';

      case 'Processing':

      case 'Partially Delivered':

        return 'info';

      case 'Pending':

      case 'Awaiting Delivery':

        return 'warning';

      case 'Cancelled':

      case 'Failed':

        return 'danger';

      case 'Refunded':

        return 'neutral';

      default:

        return 'neutral';

    }

  }



  protected formatCallbackPayload(payloadJson: string): string {

    try {

      return JSON.stringify(JSON.parse(payloadJson), null, 2);

    } catch {

      return payloadJson;

    }

  }



  protected openStatusDialog(): void {
    this.actionReason.set('');

    this.selectedStatus.set(this.detail()?.orderStatus ?? 'Completed');

    this.statusDialogOpen.set(true);

  }



  protected openManualCodeDialog(): void {

    const first = this.itemsNeedingCodes()[0];

    this.manualCodeItemId.set(first?.id ?? null);

    this.manualCodeValue.set('');
    this.actionReason.set('');

    this.manualCodeDialogOpen.set(true);

  }



  protected async confirmStatusChange(): Promise<void> {

    const id = this.orderId();

    const reason = this.actionReason().trim();
    if (!reason) return;
    const ok = await this.facade.updateStatus(id, this.selectedStatus(), reason);

    this.statusDialogOpen.set(false);

    if (ok) {

      this.toast('success', 'ADMIN.ORDERS.DETAIL.STATUS_UPDATED');

    }

  }



  protected async confirmRefund(): Promise<void> {

    const id = this.orderId();

    const reason = this.actionReason().trim();
    if (!reason) return;
    const ok = await this.facade.refundOrder(id, reason);

    this.refundDialogOpen.set(false);

    if (ok) {

      this.toast('success', 'ADMIN.ORDERS.DETAIL.REFUNDED');

    }

  }



  protected async confirmResendCodes(): Promise<void> {

    const id = this.orderId();

    const ok = await this.facade.resendCodes(id);

    this.resendDialogOpen.set(false);

    if (ok) {

      this.toast('success', 'ADMIN.ORDERS.DETAIL.CODES_RESENT');

    }

  }



  protected async confirmRetryFulfillment(): Promise<void> {

    const id = this.orderId();

    const result = await this.facade.retryFulfillment(id);

    this.retryDialogOpen.set(false);

    if (result) {

      this.messageService.add({

        severity: 'success',

        summary: this.translate.instant('ADMIN.ORDERS.DETAIL.RETRY_SUCCESS', {

          count: result.codesDelivered,

        }),

      });

    }

  }



  protected async confirmManualCode(): Promise<void> {

    const itemId = this.manualCodeItemId();

    const code = this.manualCodeValue().trim();

    if (!itemId || !code) return;



    const reason = this.actionReason().trim();
    if (!reason) return;
    const ok = await this.facade.assignManualCode(this.orderId(), itemId, code, reason);

    this.manualCodeDialogOpen.set(false);

    if (ok) {

      this.toast('success', 'ADMIN.ORDERS.DETAIL.MANUAL_CODE_SAVED');

    }

  }



  protected openRefundDialog(): void {
    this.actionReason.set('');
    this.refundDialogOpen.set(true);
  }

  protected openMarkDeliveredDialog(): void {
    this.actionReason.set('');
    this.deliveryEvidence.set('');
    this.markDeliveredDialogOpen.set(true);
  }

  protected async confirmMarkDelivered(): Promise<void> {
    const reason = this.actionReason().trim();
    const evidence = this.deliveryEvidence().trim();
    if (!reason || !evidence) return;

    if (await this.facade.markDelivered(this.orderId(), reason, evidence)) {
      this.markDeliveredDialogOpen.set(false);
      this.messageService.add({ severity: 'success', summary: 'Order marked as delivered' });
    }
  }

  protected openContactDialog(): void {
    this.contactSubject.set(`About your order ${this.detail()?.orderNumber ?? ''}`.trim());
    this.contactMessage.set('');
    this.contactDialogOpen.set(true);
  }

  protected async confirmContact(): Promise<void> {
    const subject = this.contactSubject().trim();
    const message = this.contactMessage().trim();
    if (!subject || !message) return;

    if (await this.facade.contactCustomer(this.orderId(), subject, message)) {
      this.contactDialogOpen.set(false);
      this.messageService.add({ severity: 'success', summary: 'Message sent to the customer' });
    }
  }

  protected async saveNote(): Promise<void> {

    const body = this.noteBody().trim();

    if (!body) return;



    const ok = await this.facade.saveNote(this.orderId(), body, this.editingNoteId() ?? undefined);

    if (ok) {

      this.noteBody.set('');

      this.editingNoteId.set(null);

      this.toast('success', 'ADMIN.ORDERS.DETAIL.NOTE_SAVED');

    }

  }



  protected editNote(noteId: string, body: string): void {

    this.editingNoteId.set(noteId);

    this.noteBody.set(body);

  }



  protected readonly refundReference = signal('');

  protected readonly refundNote = signal('');

  protected async settleRefund(): Promise<void> {

    const reference = this.refundReference().trim();

    if (!reference) return;

    if (await this.facade.settleRefund(this.orderId(), reference, this.refundNote().trim() || null)) {

      this.refundReference.set('');

      this.refundNote.set('');

    }

  }

  protected readonly holdDialogOpen = signal(false);

  protected readonly holdReason = signal('');

  protected openHoldDialog(): void {

    this.holdReason.set('');

    this.holdDialogOpen.set(true);

  }

  protected async confirmHold(): Promise<void> {

    const reason = this.holdReason().trim();

    if (!reason) return;

    if (await this.facade.holdOrder(this.orderId(), reason)) {

      this.holdDialogOpen.set(false);

    }

  }

  protected async releaseHold(): Promise<void> {

    await this.facade.releaseOrderHold(this.orderId(), null);

  }

  protected readonly revealReasonTargetId = signal<string | null>(null);

  protected readonly revealReason = signal('');

  protected readonly revealing = signal(false);

  protected requestReveal(licenseKeyId: string): void {

    this.revealReason.set('');

    this.revealReasonTargetId.set(licenseKeyId);

  }

  protected async confirmReveal(): Promise<void> {

    const licenseKeyId = this.revealReasonTargetId();

    const reason = this.revealReason().trim();

    if (!licenseKeyId || !reason) return;

    this.revealing.set(true);

    try {

      const key = await this.facade.revealLicenseKey(this.orderId(), licenseKeyId, reason);

      if (!key) return;

      this.revealedKeys.update((current) => ({ ...current, [licenseKeyId]: key }));

      this.revealReasonTargetId.set(null);

    } finally {

      this.revealing.set(false);

    }

  }



  protected copyText(value: string | null | undefined): void {

    if (!value) return;

    void navigator.clipboard.writeText(value);

    this.toast('success', 'ADMIN.ORDERS.ACTIONS.COPIED');

  }



  protected printInvoice(): void {

    window.print();

  }



  protected overflowActions(order: AdminOrderDetailDto): MenuItem[] {

    const t = (key: string) => this.translate.instant(key);
    const items: MenuItem[] = [
      { label: t('ADMIN.ORDERS.ACTIONS.COPY_ID'), icon: 'pi pi-copy', command: () => this.copyText(order.id) },
      {
        label: t('ADMIN.ORDERS.ACTIONS.COPY_TXN'),
        icon: 'pi pi-copy',
        command: () => this.copyText(order.paymentTransactionId),
      },
      { label: t('ADMIN.ORDERS.ACTIONS.PRINT'), icon: 'pi pi-print', command: () => this.printInvoice() },
      {
        label: 'Export order log (CSV)',
        icon: 'pi pi-download',
        command: () => exportOrderLogToCsv(order.orderNumber, order.auditHistory),
      },
    ];

    if (this.permissionService.hasPermission(this.permissions.Orders.Edit)) {
      items.push(
        {
          label: t('ADMIN.ORDERS.ACTIONS.RESEND_CODES'),
          icon: 'pi pi-send',
          command: () => this.resendDialogOpen.set(true),
        },
        {
          label: t('ADMIN.ORDERS.DETAIL.RETRY_FULFILLMENT'),
          icon: 'pi pi-refresh',
          disabled: !this.canRetryFulfillment(),
          command: () => this.retryDialogOpen.set(true),
        },
        {
          label: 'Mark as delivered (manual)',
          icon: 'pi pi-check-circle',
          disabled: order.paymentStatus !== 'Paid' || order.orderStatus === 'Completed',
          command: () => this.openMarkDeliveredDialog(),
        },
        {
          label: 'Contact customer',
          icon: 'pi pi-envelope',
          command: () => this.openContactDialog(),
        },
        {
          label: t('ADMIN.ORDERS.DETAIL.ASSIGN_MANUAL_CODE'),
          icon: 'pi pi-key',
          disabled: this.itemsNeedingCodes().length === 0,
          command: () => this.openManualCodeDialog(),
        },
      );
    }

    return items;

  }



  protected formatMoney(amount: number): string {

    return this.currencyService.format(amount);

  }



  private toast(severity: 'success' | 'error', key: string): void {

    this.messageService.add({

      severity,

      summary: this.translate.instant(key),

    });

  }

}


