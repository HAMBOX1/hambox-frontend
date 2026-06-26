import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-order-support-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './order-support-sidebar.component.html',
  styleUrl: './order-support-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSupportSidebarComponent {}
