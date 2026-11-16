import { Directive, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

/**
 * A link whose address was typed by an admin (a button or card in the Page Builder, a category tile…): an in-app path
 * (`/products`, `/products?category=…`, `/faq#refunds`) or a full address (`https://…`, `mailto:…`).
 *
 * `routerLink` cannot take those as a plain string: it treats `?` and `#` as part of the path name, so
 * `/products?category=5` opened a page that does not exist and sent the visitor back to the home page, and a full address
 * was not a link at all. This directive reads the address properly: in-app paths navigate through the router (query and
 * fragment kept, no page reload), full addresses are normal links, and a modified click (new tab…) keeps its default.
 */
@Directive({
  selector: 'a[hamboxLink]',
  standalone: true,
  host: {
    '[attr.href]': 'href()',
    '[attr.target]': 'opensNewTab() ? "_blank" : null',
    '[attr.rel]': 'opensNewTab() ? "noopener noreferrer" : null',
    '(click)': 'onClick($event)',
  },
})
export class HamboxLinkDirective {
  private readonly router = inject(Router);

  readonly hamboxLink = input<string | null | undefined>(null);

  private readonly address = computed(() => (this.hamboxLink() ?? '').trim());

  /** A full address or another scheme (mailto:, tel:) — anything the router must not handle. */
  protected readonly isExternal = computed(() => /^[a-z][a-z0-9+.-]*:/i.test(this.address()) || this.address().startsWith('//'));

  protected readonly opensNewTab = computed(() => /^https?:\/\//i.test(this.address()));

  protected readonly href = computed(() => {
    const address = this.address();
    if (!address) {
      return null;
    }
    return this.isExternal() ? address : this.router.serializeUrl(this.router.parseUrl(this.normalized(address)));
  });

  protected onClick(event: MouseEvent): void {
    const address = this.address();
    if (!address || this.isExternal() || event.defaultPrevented) {
      return;
    }
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    void this.router.navigateByUrl(this.normalized(address));
  }

  /** An in-app address always starts with a slash, even when the admin typed `products`. */
  private normalized(address: string): string {
    return address.startsWith('/') ? address : `/${address}`;
  }
}
