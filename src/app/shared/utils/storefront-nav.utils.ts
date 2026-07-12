import { ParamMap } from '@angular/router';

import { NavLink } from '../../features/home/models/storefront-home';

const DEFAULT_NAV_SECTION = 'games';

export function resolveNavSection(params: ParamMap): string {
  return params.get('section') ?? DEFAULT_NAV_SECTION;
}

export function isStorefrontNavLinkActive(link: NavLink, url: string, params: ParamMap): boolean {
  const normalizedUrl = url.split('?')[0];
  if (normalizedUrl !== link.route && !normalizedUrl.startsWith(`${link.route}/`)) {
    return false;
  }

  const activeSection = resolveNavSection(params);
  const linkSection = link.section ?? DEFAULT_NAV_SECTION;
  return activeSection === linkSection;
}

export function navLinkQueryParams(link: NavLink): Record<string, string> | undefined {
  const section = link.section ?? DEFAULT_NAV_SECTION;
  return section === DEFAULT_NAV_SECTION ? undefined : { section };
}
