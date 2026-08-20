import {

  ChangeDetectionStrategy,

  Component,

  ElementRef,

  HostListener,

  computed,

  inject,

  input,

  OnInit,

  signal,

  viewChild,

} from '@angular/core';

import { Router, RouterLink } from '@angular/router';

import { NgTemplateOutlet } from '@angular/common';

import { TranslatePipe } from '@ngx-translate/core';



import { AccountNotificationsFacade } from '../../../features/account/services/account-notifications.facade';

import { UserNotificationApiDto } from '../../../features/account/models/account-api.model';

import { HamboxTranslateRefreshDirective } from '../../directives/hambox-translate-refresh.directive';

import { HamboxBottomSheetComponent } from '../hambox-bottom-sheet/hambox-bottom-sheet.component';

import { MobileViewportService } from '../../services/mobile-viewport.service';

import { getNotificationTypeMeta, groupNotificationsByDate } from '../../utils/notification-type.util';

import { HamboxRelativeTimePipe } from '../../pipes/hambox-relative-time.pipe';



@Component({

  selector: 'app-notification-bell',

  standalone: true,

  imports: [RouterLink, NgTemplateOutlet, TranslatePipe, HamboxRelativeTimePipe, HamboxTranslateRefreshDirective, HamboxBottomSheetComponent],

  templateUrl: './notification-bell.component.html',

  styleUrl: './notification-bell.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class NotificationBellComponent implements OnInit {

  private readonly notifications = inject(AccountNotificationsFacade);

  private readonly router = inject(Router);

  private readonly mobile = inject(MobileViewportService);

  private readonly host = viewChild<ElementRef<HTMLElement>>('host');



  compact = input(false);



  protected readonly open = signal(false);

  protected readonly useSheet = computed(() => this.mobile.isMobile());

  protected readonly unreadCount = this.notifications.unreadCount;

  protected readonly loading = this.notifications.loading;

  protected readonly items = this.notifications.items;

  protected readonly hasUnread = this.notifications.hasUnread;



  protected readonly groups = computed(() => groupNotificationsByDate(this.items()));



  ngOnInit(): void {

    void this.notifications.load();

  }



  @HostListener('document:click', ['$event'])

  protected onDocumentClick(event: MouseEvent): void {

    if (this.useSheet() || !this.open()) {

      return;

    }



    const root = this.host()?.nativeElement;

    if (root && !root.contains(event.target as Node)) {

      this.open.set(false);

    }

  }



  protected toggle(event: Event): void {

    event.stopPropagation();

    const next = !this.open();

    this.open.set(next);

    if (next) {

      void this.notifications.load();

    }

  }



  protected async openNotification(item: UserNotificationApiDto): Promise<void> {

    if (!item.isRead) {

      await this.notifications.markRead(item.id);

    }



    this.open.set(false);

    const target = item.actionUrl?.trim() || '/account/library';

    void this.router.navigateByUrl(target);

  }



  protected async markRead(item: UserNotificationApiDto, event: Event): Promise<void> {

    event.stopPropagation();

    if (!item.isRead) {

      await this.notifications.markRead(item.id);

    }

  }



  protected markAllRead(): void {

    void this.notifications.markAllRead();

  }



  protected clearAll(): void {

    void this.notifications.clearAll();

    this.open.set(false);

  }



  protected close(): void {

    this.open.set(false);

  }



  protected actionLabel(item: UserNotificationApiDto): string {

    const url = item.actionUrl?.toLowerCase() ?? '';

    if (url.includes('/orders')) {

      return 'NOTIFICATIONS.VIEW_ORDER';

    }

    if (url.includes('/library')) {

      return 'NOTIFICATIONS.VIEW_LIBRARY';

    }

    return 'NOTIFICATIONS.VIEW_DETAILS';

  }



  protected notificationIcon(item: UserNotificationApiDto): string {
    const url = item.actionUrl?.toLowerCase() ?? '';
    if (url.includes('/library')) {
      return 'pi pi-key';
    }

    return getNotificationTypeMeta(item.category).icon;
  }

  protected notificationSemantic(item: UserNotificationApiDto): string {
    return getNotificationTypeMeta(item.category).semantic;
  }
}


