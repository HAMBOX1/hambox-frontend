import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { BrandLogoService } from './brand-logo.service';

const KEY = 'hambox.brand.logoUrl';

function createService(get: () => unknown): BrandLogoService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: ApiClientService, useValue: { get } }] });
  return TestBed.inject(BrandLogoService);
}

describe('BrandLogoService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('shows the text wordmark (no logo) when none is set', async () => {
    const service = createService(() => of({ branding: { logoUrl: null } }));

    service.ensureLoaded();
    await Promise.resolve();
    await Promise.resolve();

    expect(service.logoUrl()).toBeNull();
  });

  it('uses the uploaded logo and remembers it for the next visit', async () => {
    const service = createService(() => of({ branding: { logoUrl: ' /uploads/logo.png ' } }));

    service.ensureLoaded();
    await Promise.resolve();
    await Promise.resolve();

    expect(service.logoUrl()).toBe('/uploads/logo.png');
    expect(localStorage.getItem(KEY)).toBe('/uploads/logo.png');
    expect(createService(() => of({})).logoUrl()).toBe('/uploads/logo.png');
  });

  it('goes back to the text wordmark when the logo is removed', async () => {
    localStorage.setItem(KEY, '/uploads/old.png');
    const service = createService(() => of({ branding: { logoUrl: '' } }));

    service.ensureLoaded();
    await Promise.resolve();
    await Promise.resolve();

    expect(service.logoUrl()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('keeps the last known logo when the settings call fails', async () => {
    localStorage.setItem(KEY, '/uploads/old.png');
    const service = createService(() => throwError(() => new Error('down')));

    service.ensureLoaded();
    await Promise.resolve();
    await Promise.resolve();

    expect(service.logoUrl()).toBe('/uploads/old.png');
  });
});
