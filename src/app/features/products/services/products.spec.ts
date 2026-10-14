import { TestBed } from '@angular/core/testing';

import { provideApiTestBed } from '../../../testing/common-test.providers';
import { Products } from './products';

describe('Products', () => {
  let service: Products;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideApiTestBed()] });
    service = TestBed.inject(Products);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
