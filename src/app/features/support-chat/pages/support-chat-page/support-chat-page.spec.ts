import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupportChatPage } from './support-chat-page';

describe('SupportChatPage', () => {
  let component: SupportChatPage;
  let fixture: ComponentFixture<SupportChatPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupportChatPage],
    }).compileComponents();

    fixture = TestBed.createComponent(SupportChatPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
