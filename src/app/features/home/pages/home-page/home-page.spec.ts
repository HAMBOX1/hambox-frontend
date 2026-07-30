import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { provideApiTestBed } from '../../../../testing/common-test.providers';
import { HomePageComponent } from './home-page.component';
import { HomeFacade } from '../../services/home.facade';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;

  beforeEach(async () => {
    const facadeStub = {
      loading: signal(false),
      error: signal<string | null>(null),
      content: signal(null),
      sections: signal([]),
      categories: signal([]),
      featuredProducts: signal([]),
      featuredHighlight: signal(null),
      trendingRanks: signal([]),
      trendingValue: signal(null),
      flashCountdownSeconds: signal(0),
      hasCategories: signal(false),
      hasFeaturedProducts: signal(false),
      hasTrending: signal(false),
      load: jasmine.createSpy('load').and.resolveTo(),
      retry: jasmine.createSpy('retry').and.resolveTo(),
    };

    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([]),
        provideApiTestBed(),
        { provide: HomeFacade, useValue: facadeStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
