import { NgTemplateOutlet } from '@angular/common';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PermissionService } from '../../../../core/permissions/permission.service';
import { ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, AdminNavGroup, AdminNavItem } from '../../models/admin-nav.model';
import { AdminSidebarStateService } from '../../services/admin-sidebar-state.service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, TranslatePipe],
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
    ADMIN_NAV_ITEMS.filter((item) =>
      item.ownerOnly ? this.permissionService.isOwner() : this.permissionService.canViewNavItem(item.permission),
    ),
  );

  /** The sidebar as shown when it is wide: plain links and collapsible groups, in the order of `ADMIN_NAV_GROUPS`. */
  protected readonly navEntries = computed<readonly NavEntry[]>(() => {
    const visible = new Map(this.navItems().map((item) => [item.id, item]));
    const grouped = new Set<string>(ADMIN_NAV_GROUPS.flatMap((group) => group.itemIds));
    const entries: NavEntry[] = [];

    const dashboard = visible.get('dashboard');
    if (dashboard) {
      entries.push({ kind: 'link', item: dashboard });
    }

    for (const group of ADMIN_NAV_GROUPS) {
      const items = group.itemIds.map((id) => visible.get(id)).filter((item): item is AdminNavItem => !!item);
      if (items.length === 1) {
        entries.push({ kind: 'link', item: items[0] });
      } else if (items.length > 1) {
        entries.push({ kind: 'group', group, items });
      }
    }

    for (const item of this.navItems()) {
      if (item.id !== 'dashboard' && item.id !== 'settings' && !grouped.has(item.id)) {
        entries.push({ kind: 'link', item });
      }
    }

    const settings = visible.get('settings');
    if (settings) {
      entries.push({ kind: 'link', item: settings });
    }

    return entries;
  });

  private readonly router = inject(Router);
  private readonly openGroups = signal<ReadonlySet<string>>(new Set());

  private readonly nav = viewChild<ElementRef<HTMLElement>>('nav');
  private resizeObserver?: ResizeObserver;

  /** The nav list is long enough to need scrolling (on mobile especially — see
   * `canScrollDown`'s doc comment); these drive the fade edges so it never looks like the
   * list just ends, the way the storefront category pill strip did before its own fix. */
  protected readonly canScrollUp = signal(false);
  protected readonly canScrollDown = signal(false);

  constructor() {
    effect(() => {
      this.navEntries();
      this.openGroups();
      queueMicrotask(() => this.updateScrollState());
    });

    // The group holding the page being viewed is always open, so the active link is never hidden.
    this.openActiveGroup(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe((event) => this.openActiveGroup(event.urlAfterRedirects));
  }

  protected isGroupOpen(groupId: string): boolean {
    return this.openGroups().has(groupId);
  }

  protected toggleGroup(groupId: string): void {
    this.openGroups.update((current) => {
      const next = new Set(current);
      if (!next.delete(groupId)) {
        next.add(groupId);
      }
      return next;
    });
  }

  private openActiveGroup(url: string): void {
    const group = ADMIN_NAV_GROUPS.find((candidate) =>
      candidate.itemIds.some((id) => {
        const item = ADMIN_NAV_ITEMS.find((navItem) => navItem.id === id);
        return !!item && (url === item.route || url.startsWith(item.route + '/') || url.startsWith(item.route + '?'));
      }),
    );
    if (group && !this.openGroups().has(group.id)) {
      this.openGroups.update((current) => new Set(current).add(group.id));
    }
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

type NavEntry =
  | { readonly kind: 'link'; readonly item: AdminNavItem }
  | { readonly kind: 'group'; readonly group: AdminNavGroup; readonly items: readonly AdminNavItem[] };
