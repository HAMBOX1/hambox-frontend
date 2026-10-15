import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

import { ApiClientService } from '../api/api-client.service';
import { SETTINGS_API } from '../api/api-endpoints';

interface SeoSettings {
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly openGraphImageUrl: string;
  readonly twitterCardType: string;
  readonly robotsDirective: string;
  readonly canonicalBaseUrl: string;
}

export interface ProductSeo {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly price: number;
  readonly currency: string;
  readonly inStock: boolean;
  readonly categoryName?: string | null;
  readonly categoryId?: string | null;
}

/** Areas that must stay out of search results even when the site itself is indexable. */
const PRIVATE_PREFIXES = ['/admin', '/account', '/cart', '/checkout', '/auth', '/login', '/register'];
const LD_ATTR = 'data-hambox-ld';

/**
 * Search-engine facing metadata (audit R54): canonical URL, Open Graph / Twitter tags, robots, and JSON-LD for the
 * Organization, WebSite, Product and BreadcrumbList. Page components that already set their own title/description
 * win — the defaults here only fill in what a page did not.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly api = inject(ApiClientService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  private settings: SeoSettings | null = null;
  private readonly initialTitle = this.document.title;

  async init(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.get<{ readonly seo?: Partial<SeoSettings> }>(SETTINGS_API.publicSettings),
      );
      const s = response.seo;
      this.settings = {
        metaTitle: s?.metaTitle ?? '',
        metaDescription: s?.metaDescription ?? '',
        openGraphImageUrl: s?.openGraphImageUrl ?? '',
        twitterCardType: s?.twitterCardType ?? 'summary_large_image',
        robotsDirective: s?.robotsDirective ?? 'index,follow',
        canonicalBaseUrl: s?.canonicalBaseUrl ?? '',
      };
    } catch {
      this.settings = null;
    }

    this.applyOrganization();
    this.applyDefaults(this.router.url);

    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((event) => {
      this.clearJsonLd('product');
      this.clearJsonLd('breadcrumb');
      this.applyDefaults(event.urlAfterRedirects);
    });
  }

  /** Called by the product page once it has loaded the product. */
  setProduct(product: ProductSeo): void {
    const title = `${product.title} | ${this.siteName()}`;
    const description = this.truncate(this.stripHtml(product.description), 160);
    const url = this.canonicalFor(`/products/${product.id}`);

    this.title.setTitle(title);
    this.setTag('name', 'description', description);
    this.setTag('property', 'og:type', 'product');
    this.setTag('property', 'og:title', title);
    this.setTag('property', 'og:description', description);
    this.setTag('property', 'og:url', url);
    this.setTag('name', 'twitter:title', title);
    this.setTag('name', 'twitter:description', description);
    if (product.imageUrl) {
      const image = this.absolute(product.imageUrl);
      this.setTag('property', 'og:image', image);
      this.setTag('name', 'twitter:image', image);
    }

    this.setCanonical(url);

    this.setJsonLd('product', {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description,
      image: product.imageUrl ? [this.absolute(product.imageUrl)] : undefined,
      sku: product.id,
      url,
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: product.currency,
        price: product.price.toFixed(2),
        availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    });

    const crumbs: { name: string; url: string }[] = [
      { name: 'Home', url: this.canonicalFor('/') },
      { name: 'Products', url: this.canonicalFor('/products') },
    ];
    if (product.categoryName) {
      crumbs.push({ name: product.categoryName, url: this.canonicalFor('/products') });
    }

    crumbs.push({ name: product.title, url });
    this.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
    });
  }

  private applyDefaults(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    const isPrivate = PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
    const directive = isPrivate ? 'noindex,nofollow' : (this.settings?.robotsDirective ?? 'index,follow');
    this.setTag('name', 'robots', directive);

    if (isPrivate) {
      this.removeCanonical();
      return;
    }

    const s = this.settings;
    const current = this.title.getTitle();
    if (s?.metaTitle && (!current || current === this.initialTitle)) {
      this.title.setTitle(s.metaTitle);
    }

    if (s?.metaDescription && !this.meta.getTag("name='description'")) {
      this.setTag('name', 'description', s.metaDescription);
    }

    const canonical = this.canonicalFor(path);
    this.setCanonical(canonical);
    this.setTag('property', 'og:site_name', this.siteName());
    this.setTag('property', 'og:url', canonical);
    if (!this.meta.getTag("property='og:type'")) {
      this.setTag('property', 'og:type', 'website');
    }

    this.setTag('property', 'og:title', this.title.getTitle());
    const description = this.meta.getTag("name='description'")?.content ?? s?.metaDescription;
    if (description) {
      this.setTag('property', 'og:description', description);
    }

    if (s?.openGraphImageUrl) {
      const image = this.absolute(s.openGraphImageUrl);
      this.setTag('property', 'og:image', image);
      this.setTag('name', 'twitter:image', image);
    }

    this.setTag('name', 'twitter:card', s?.twitterCardType ?? 'summary_large_image');
  }

  private applyOrganization(): void {
    const base = this.baseUrl();
    this.setJsonLd('organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: this.siteName(),
      url: base,
      logo: this.absolute('/favicon.png'),
    });
    this.setJsonLd('website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.siteName(),
      url: base,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${base}/products?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });
  }

  private siteName(): string {
    return 'HAMBOX';
  }

  private baseUrl(): string {
    const configured = this.settings?.canonicalBaseUrl ?? '';
    try {
      const url = new URL(configured);
      if ((url.protocol === 'https:' || url.protocol === 'http:') && !this.isLocal(url.hostname)) {
        return url.origin;
      }
    } catch {
      // Fall through to the origin the visitor is actually on.
    }

    return this.document.location?.origin ?? '';
  }

  private isLocal(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  }

  private canonicalFor(path: string): string {
    return this.baseUrl() + (path.startsWith('/') ? path : '/' + path);
  }

  private absolute(url: string): string {
    return /^https?:\/\//i.test(url) ? url : this.baseUrl() + (url.startsWith('/') ? url : '/' + url);
  }

  private setTag(attr: 'name' | 'property', key: string, content: string): void {
    this.meta.updateTag({ [attr]: key, content } as { name?: string; property?: string; content: string });
  }

  private setCanonical(href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }

    link.href = href;
  }

  private removeCanonical(): void {
    this.document.head.querySelector('link[rel="canonical"]')?.remove();
  }

  private setJsonLd(kind: string, data: Record<string, unknown>): void {
    let script = this.document.head.querySelector<HTMLScriptElement>(`script[${LD_ATTR}="${kind}"]`);
    if (!script) {
      script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute(LD_ATTR, kind);
      this.document.head.appendChild(script);
    }

    // `<` is escaped so a product title can never close the script element.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }

  private clearJsonLd(kind: string): void {
    this.document.head.querySelector(`script[${LD_ATTR}="${kind}"]`)?.remove();
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private truncate(value: string, max: number): string {
    return value.length <= max ? value : value.slice(0, max - 1).trimEnd() + '…';
  }
}
