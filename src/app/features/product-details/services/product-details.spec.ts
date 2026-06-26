import { TestBed } from '@angular/core/testing';

import { ProductDetails } from './product-details';

describe('ProductDetails', () => {
  let service: ProductDetails;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductDetails);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
