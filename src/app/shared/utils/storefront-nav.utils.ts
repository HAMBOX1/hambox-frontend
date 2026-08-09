import { ParamMap } from '@angular/router';

import { NavLink } from '../../features/home/models/storefront-home';

/**
 * The section shown when `/products` is reached with no `?section=` at all — every non-nav entry
 * point (breadcrumbs, "back to store", footer links, related products, PDP fallbacks, …) lands here.
 * Must mean "show every product" — it must never silently apply one of the curated nav tabs' filters
 * (see `ProductsFacade.matchesSection`), or whole categories of products (gift cards, subscriptions)
 * disappear from every generic storefront entry point.
 */
const ALL_SECTIONS = 'all';

export function resolveNavSection(params: ParamMap): string {
  return params.get('section') ?? ALL_SECTIONS;
}

export function isStorefrontNavLinkActive(link: NavLink, url: string, params: ParamMap): boolean {
  const normalizedUrl = url.split('?')[0];
  if (normalizedUrl !== link.route && !normalizedUrl.startsWith(`${link.route}/`)) {
    return false;
  }

  const activeSection = resolveNavSection(params);
  const linkSection = link.section ?? ALL_SECTIONS;
  return activeSection === linkSection;
}

// Every nav tab (including "Games") is its own explicit filter now — none of them is "the default"
// anymore, so every tab always states its section in the URL rather than one tab hiding it.
export function navLinkQueryParams(link: NavLink): Record<string, string> | undefined {
  const section = link.section ?? ALL_SECTIONS;
  return section === ALL_SECTIONS ? undefined : { section };
}
