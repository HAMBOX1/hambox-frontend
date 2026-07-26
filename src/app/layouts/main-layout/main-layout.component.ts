import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AccountMobileSheetComponent } from '../../shared/components/account-mobile-sheet/account-mobile-sheet.component';
import { MobileBottomNavComponent } from '../../shared/components/mobile-bottom-nav/mobile-bottom-nav.component';
import { AssistantWidgetComponent } from '../../features/assistant/components/assistant-widget/assistant-widget.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MobileBottomNavComponent,
    AccountMobileSheetComponent,
    AssistantWidgetComponent,
  ],
  template: `
    <router-outlet />
    <app-mobile-bottom-nav />
    <app-account-mobile-sheet />
    <app-assistant-widget />
  `,
  styles: ``,
})
export class MainLayoutComponent {}
