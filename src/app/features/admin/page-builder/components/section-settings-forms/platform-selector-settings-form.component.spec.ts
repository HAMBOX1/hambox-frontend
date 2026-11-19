import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { PlatformSelectorSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { PlatformSelectorSettingsFormComponent } from './platform-selector-settings-form.component';

describe('PlatformSelectorSettingsFormComponent', () => {
  it('still shows the form and its Add button when the saved section has no tile list', () => {
    TestBed.configureTestingModule({ providers: [provideTranslateService({ lang: 'en', fallbackLang: 'en' })] });
    const fixture = TestBed.createComponent(PlatformSelectorSettingsFormComponent);
    fixture.componentRef.setInput('config', {} as unknown as PlatformSelectorSectionConfig);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.platform-selector-form__empty')).not.toBeNull();
    expect(el.querySelector('.platform-selector-form__add')).not.toBeNull();
  });
});
