import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/support-chat-page/support-chat-page.component').then(c => c.SupportChatPageComponent)
  }
];
