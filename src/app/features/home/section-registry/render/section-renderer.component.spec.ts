import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LandingPageSectionEntry } from '../../models/landing-page-section.model';
import { SectionProductSourceService } from '../../services/section-product-source.service';
import { SectionRenderContext } from '../models/section-variant.model';
import { SectionRendererComponent } from './section-renderer.component';

function render(common: Record<string, unknown>) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: SectionProductSourceService, useValue: {} }],
  });
  const entry = {
    instanceId: 'e1',
    category: 'Navigation',
    variantKey: 'platform-selector',
    isVisible: true,
    configJson: JSON.stringify({
      items: [{ id: 'a', label: 'Xbox', iconClass: 'pi pi-box', linkUrl: '/products' }],
      _common: common,
    }),
  } as unknown as LandingPageSectionEntry;

  const fixture = TestBed.createComponent(SectionRendererComponent);
  fixture.componentRef.setInput('entry', entry);
  fixture.componentRef.setInput('context', {} as SectionRenderContext);
  fixture.detectChanges();
  return fixture;
}

describe('SectionRendererComponent: the section button', () => {
  it('writes the lines above and below the button, in that order', async () => {
    const fixture = render({ buttonLabel: 'Shop', buttonUrl: '/products', buttonTextAbove: 'Limited time', buttonTextBelow: 'While stock lasts' });
    await fixture.whenStable();
    fixture.detectChanges();

    const stack = (fixture.nativeElement as HTMLElement).querySelector('.section-common-cta__stack');
    expect([...(stack?.children ?? [])].map((c) => c.textContent?.trim())).toEqual(['Limited time', 'Shop', 'While stock lasts']);
  });

  it('shows the lines of text even when no button is set', async () => {
    const fixture = render({ buttonTextBelow: 'Free delivery' });
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.section-common-cta__button')).toBeNull();
    expect(el.querySelector('.section-common-cta__text')?.textContent).toContain('Free delivery');
  });

  it('puts the button inside the section when asked to', async () => {
    const fixture = render({ buttonLabel: 'Shop', buttonUrl: '/products', buttonPlacement: 'inside' });
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const cta = el.querySelector('.section-common-cta') as HTMLElement;
    const wrapper = el.querySelector('.section-transition') as HTMLElement;
    // Not a direct child of the wrapper (that is "after the section"): it sits within the section's own markup.
    expect(cta.parentElement).not.toBe(wrapper);
    expect(wrapper.firstElementChild?.contains(cta)).toBe(true);
  });

  it('passes the text size, text colour, font and button colours to the section', async () => {
    const fixture = render({
      buttonLabel: 'Shop',
      buttonUrl: '/products',
      textFontSize: 20,
      textColor: '#eeeeee',
      fontFamily: 'heading',
      buttonColor: '#ff0000',
      buttonTextColor: '#000000',
      buttonFontSize: 22,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const wrapper = el.querySelector('.section-transition') as HTMLElement;
    expect(wrapper.classList.contains('section-text-size')).toBe(true);
    expect(wrapper.style.getPropertyValue('--section-text-size')).toBe('20px');
    expect(wrapper.style.getPropertyValue('--section-text-color')).toBe('#eeeeee');
    expect(wrapper.getAttribute('data-section-font')).toBe('heading');
    const cta = el.querySelector('.section-common-cta') as HTMLElement;
    expect(cta.style.getPropertyValue('--cta-bg')).toBe('#ff0000');
    expect(cta.style.getPropertyValue('--cta-fg')).toBe('#000000');
    expect(cta.style.getPropertyValue('--cta-font-size')).toBe('22px');
  });
});
