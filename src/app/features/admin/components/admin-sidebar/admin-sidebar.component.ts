import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PermissionService } from '../../../../core/permissions/permission.service';
import { ADMIN_NAV_ITEMS } from '../../models/admin-nav.model';
import { AdminSidebarStateService } from '../../services/admin-sidebar-state.service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSidebarComponent implements AfterViewInit, OnDestroy {
  private readonly permissionService = inject(PermissionService);
  private readonly translate = inject(TranslateService);
  protected readonly sidebarState = inject(AdminSidebarStateService);

  readonly mobileOpen = input(false);
  readonly closeMobile = output<void>();

  protected readonly logoSrc = 'assets/images/top-nav/hambox-title.png';
  protected readonly logoMarkSrc = 'assets/images/top-nav/hambox-mark.png';
  protected readonly navItems = computed(() =>
    ADMIN_NAV_ITEMS.filter((item) => this.permissionService.canViewNavItem(item.permission)),
  );

  private readonly nav = viewChild<ElementRef<HTMLElement>>('nav');
  private resizeObserver?: ResizeObserver;

  /** The nav list is long enough to need scrolling (on mobile especially — see
   * `canScrollDown`'s doc comment); these drive the fade edges so it never looks like the
   * list just ends, the way the storefront category pill strip did before its own fix. */
  protected readonly canScrollUp = signal(false);
  protected readonly canScrollDown = signal(false);

  constructor() {
    effect(() => {
      this.navItems();
      queueMicrotask(() => this.updateScrollState());
    });
  }

  ngAfterViewInit(): void {
    const element = this.nav()?.nativeElement;
    if (!element) {
      return;
    }

    this.updateScrollState();
    this.resizeObserver = new ResizeObserver(() => this.updateScrollState());
    this.resizeObserver.observe(element);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  protected navTooltip(labelKey: string): string | null {
    return this.sidebarState.collapsed() ? this.translate.instant(labelKey) : null;
  }

  protected onNavigate(): void {
    this.closeMobile.emit();
  }

  protected onNavScroll(): void {
    this.updateScrollState();
  }

  protected toggleCollapsed(): void {
    this.sidebarState.toggle();
  }

  private updateScrollState(): void {
    const element = this.nav()?.nativeElement;
    if (!element) {
      this.canScrollUp.set(false);
      this.canScrollDown.set(false);
      return;
    }

    const maxScrollTop = element.scrollHeight - element.clientHeight;
    this.canScrollUp.set(element.scrollTop > 1);
    this.canScrollDown.set(element.scrollTop < maxScrollTop - 1);
  }
}
