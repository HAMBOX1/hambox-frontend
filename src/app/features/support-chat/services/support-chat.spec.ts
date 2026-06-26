import { TestBed } from '@angular/core/testing';

import { SupportChat } from './support-chat';

describe('SupportChat', () => {
  let service: SupportChat;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupportChat);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
