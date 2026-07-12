import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AccountMobileSheetComponent } from '../../shared/components/account-mobile-sheet/account-mobile-sheet.component';
import { MobileBottomNavComponent } from '../../shared/components/mobile-bottom-nav/mobile-bottom-nav.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, MobileBottomNavComponent, AccountMobileSheetComponent],
  template: `
    <router-outlet />
    <app-mobile-bottom-nav />
    <app-account-mobile-sheet />
  `,
  styles: ``,
})
export class MainLayoutComponent {}
