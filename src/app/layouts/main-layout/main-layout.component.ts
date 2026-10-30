import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';

import { AccountMobileSheetComponent } from '../../shared/components/account-mobile-sheet/account-mobile-sheet.component';
import { MobileBottomNavComponent } from '../../shared/components/mobile-bottom-nav/mobile-bottom-nav.component';
import { AssistantWidgetComponent } from '../../features/assistant/components/assistant-widget/assistant-widget.component';
import { FloatingAdComponent } from '../../shared/components/floating-ad/floating-ad.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MobileBottomNavComponent,
    AccountMobileSheetComponent,
    AssistantWidgetComponent,
    FloatingAdComponent,
    ToastModule,
  ],
  template: `
    <router-outlet />
    <app-mobile-bottom-nav />
    <app-account-mobile-sheet />
    <app-assistant-widget />
    <app-floating-ad />
    <p-toast />
  `,
  styles: ``,
})
export class MainLayoutComponent {}
