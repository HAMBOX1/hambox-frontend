import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { API_BASE_URL } from '../core/tokens/api-base-url.token';

export function provideApiTestBed(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(),
    provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: '' },
  ]);
}
