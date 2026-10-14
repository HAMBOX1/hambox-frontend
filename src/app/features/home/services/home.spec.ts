import { TestBed } from '@angular/core/testing';

import { provideApiTestBed } from '../../../testing/common-test.providers';
import { Home } from './home';

describe('Home', () => {
  let service: Home;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideApiTestBed()] });
    service = TestBed.inject(Home);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
