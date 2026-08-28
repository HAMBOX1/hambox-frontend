import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';

import { provideApiTestBed } from '../../../../testing/common-test.providers';
import { HomePageComponent } from './home-page.component';
import { HomeFacade } from '../../services/home.facade';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;

  beforeEach(async () => {
    // jsdom doesn't implement matchMedia — HomePageComponent's layout chrome transitively injects
    // MobileViewportService, which calls it eagerly in its constructor.
    if (!window.matchMedia) {
      window.matchMedia = ((query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList) as typeof window.matchMedia;
    }

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
      load: vi.fn().mockResolvedValue(undefined),
      retry: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([]),
        provideApiTestBed(),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
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
