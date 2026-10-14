import { TestBed } from '@angular/core/testing';

import { provideApiTestBed } from '../../../testing/common-test.providers';
import { ProductDetails } from './product-details';

describe('ProductDetails', () => {
  let service: ProductDetails;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideApiTestBed()] });
    service = TestBed.inject(ProductDetails);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
