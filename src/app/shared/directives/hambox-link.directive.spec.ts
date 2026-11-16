import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { HamboxLinkDirective } from './hambox-link.directive';

@Component({
  standalone: true,
  imports: [HamboxLinkDirective],
  template: `
    <a id="query" [hamboxLink]="'/products?category=5&sort=new'">q</a>
    <a id="fragment" [hamboxLink]="'/faq#refunds'">f</a>
    <a id="bare" [hamboxLink]="'products'">b</a>
    <a id="external" [hamboxLink]="'https://example.com/shop?a=1'">e</a>
    <a id="mail" [hamboxLink]="'mailto:hi@example.com'">m</a>
    <a id="empty" [hamboxLink]="''">x</a>
  `,
})
class HostComponent {}

function setup() {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const el = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLAnchorElement;
  return { el, navigate };
}

describe('HamboxLinkDirective', () => {
  it('writes an in-app address as a real link with its query string and fragment intact', () => {
    const { el } = setup();

    expect(el('query').getAttribute('href')).toBe('/products?category=5&sort=new');
    expect(el('fragment').getAttribute('href')).toBe('/faq#refunds');
    expect(el('bare').getAttribute('href')).toBe('/products');
  });

  it('navigates in-app addresses through the router, query string included, without a page reload', () => {
    const { el, navigate } = setup();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

    el('query').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/products?category=5&sort=new');
  });

  it('leaves a ctrl/cmd/middle click alone so the visitor can open a new tab', () => {
    const { el, navigate } = setup();

    el('query').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
    el('query').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 }));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('treats a full address as a normal link that opens in a new tab, and mailto as a plain link', () => {
    const { el, navigate } = setup();

    expect(el('external').getAttribute('href')).toBe('https://example.com/shop?a=1');
    expect(el('external').getAttribute('target')).toBe('_blank');
    expect(el('external').getAttribute('rel')).toContain('noopener');
    expect(el('mail').getAttribute('href')).toBe('mailto:hi@example.com');
    expect(el('mail').getAttribute('target')).toBeNull();

    el('external').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('has no href at all for an empty address', () => {
    const { el } = setup();

    expect(el('empty').hasAttribute('href')).toBe(false);
  });
});
