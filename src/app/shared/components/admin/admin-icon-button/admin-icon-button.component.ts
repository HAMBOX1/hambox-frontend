import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-admin-icon-button',
  standalone: true,
  imports: [RouterLink, ButtonModule, TooltipModule],
  templateUrl: './admin-icon-button.component.html',
  styleUrl: './admin-icon-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminIconButtonComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly severity = input<'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast'>('secondary');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly routerLink = input<string | null>(null);

  readonly pressed = output<void>();
}
