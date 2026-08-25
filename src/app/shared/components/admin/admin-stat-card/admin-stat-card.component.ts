import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-stat-card',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './admin-stat-card.component.html',
  styleUrl: './admin-stat-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly tone = input<'default' | 'success' | 'info' | 'warning' | 'danger'>('default');
  readonly compact = input(false);
  readonly routerLink = input<string | unknown[] | null>(null);
  readonly queryParams = input<Record<string, string> | null>(null);
}
