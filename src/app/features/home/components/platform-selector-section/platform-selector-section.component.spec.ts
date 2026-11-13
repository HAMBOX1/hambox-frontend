import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PlatformSelectorSectionConfig } from '../../section-registry/models/section-config.model';
import { PlatformSelectorSectionComponent } from './platform-selector-section.component';

function create(config: PlatformSelectorSectionConfig): ComponentFixture<PlatformSelectorSectionComponent> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(PlatformSelectorSectionComponent);
  fixture.componentRef.setInput('config', config);
  fixture.detectChanges();
  return fixture;
}

describe('PlatformSelectorSectionComponent', () => {
  it('shows a tile per item with its label and link', () => {
    const fixture = create({
      items: [
        { id: 'a', label: 'PlayStation', iconClass: 'pi pi-desktop', linkUrl: '/products' },
        { id: 'b', label: 'PayPal gift cards', iconClass: 'pi pi-box', linkUrl: '/products?x=1' },
      ],
    });

    const tiles = fixture.nativeElement.querySelectorAll('.platform-selector__item');
    expect(tiles).toHaveLength(2);
    expect(tiles[0].textContent).toContain('PlayStation');
    expect(tiles[1].getAttribute('href')).toBe('/products?x=1');
  });

  it('keeps a query string in the link and opens a full address as a normal link', () => {
    const fixture = create({
      items: [
        { id: 'a', label: 'In app', iconClass: 'pi pi-box', linkUrl: '/products?category=ps&sort=new' },
        { id: 'b', label: 'Outside', iconClass: 'pi pi-box', linkUrl: 'https://example.com/shop' },
      ],
    });

    const tiles = fixture.nativeElement.querySelectorAll('.platform-selector__item');
    expect(tiles[0].getAttribute('href')).toBe('/products?category=ps&sort=new');
    expect(tiles[1].getAttribute('href')).toBe('https://example.com/shop');
  });

  it('shows the uploaded picture instead of the icon when there is one', () => {
    const fixture = create({
      items: [
        { id: 'a', label: 'With picture', iconClass: 'pi pi-desktop', linkUrl: '/products', imageUrl: '/uploads/ps.png' },
        { id: 'b', label: 'Icon only', iconClass: 'pi pi-box', linkUrl: '/products' },
      ],
    });

    const tiles = fixture.nativeElement.querySelectorAll('.platform-selector__item');
    expect(tiles[0].querySelector('img')?.getAttribute('src')).toBe('/uploads/ps.png');
    expect(tiles[0].querySelector('i.pi')).toBeNull();
    expect(tiles[1].querySelector('img')).toBeNull();
    expect(tiles[1].querySelector('i.pi-box')).not.toBeNull();
  });

  it('shows no arrows while everything fits (nothing to scroll)', () => {
    const fixture = create({ items: [{ id: 'a', label: 'One', iconClass: 'pi pi-box', linkUrl: '/' }] });

    expect(fixture.nativeElement.querySelector('.platform-selector__arrow')).toBeNull();
  });
});
